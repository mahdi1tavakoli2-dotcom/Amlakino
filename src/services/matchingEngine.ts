import { Property, Client, DealType, PropertyType } from '../types';
import { formatPriceToman, toPersianDigits, getDealTypeLabel, getPropertyTypeLabel } from '../utils/formatters';

export interface MatchWeights {
  budget: number; // default: 25%
  location: number; // default: 20%
  area: number; // default: 15%
  propertyType: number; // default: 10%
  transactionType: number; // default: 10%
  bedrooms: number; // default: 10%
  features: number; // default: 10%
}

export const DEFAULT_MATCH_WEIGHTS: MatchWeights = {
  budget: 25,
  location: 20,
  area: 15,
  propertyType: 10,
  transactionType: 10,
  bedrooms: 10,
  features: 10,
};

export type ScoreQuality = 'perfect' | 'good' | 'fair' | 'poor' | 'mismatch';

export interface CriterionScore {
  criterion: keyof MatchWeights;
  label: string;
  weight: number;
  rawScore: number; // 0.0 to 1.0
  weightedScore: number; // rawScore * weight
  quality: ScoreQuality;
  explanation: string;
  isPositive: boolean; // whether to show with ✓
  isWeak: boolean; // whether to show with △ or ✗
}

export interface MatchCalculationResult {
  score: number; // 0 to 100 integer
  isViable: boolean; // score >= 50 and transaction type compatible
  criteria: Record<keyof MatchWeights, CriterionScore>;
  matchedFactors: string[]; // List of ✓ explanations
  weakFactors: string[]; // List of △ and ✗ explanations
  summary: string;
}

// Tehran neighborhood clusters and aliases for geographic proximity
const TEHRAN_CLUSTERS: Record<string, string[]> = {
  north: [
    'شمال تهران',
    'نیاوران',
    'فرمانیه',
    'کامرانیه',
    'قیطریه',
    'الهیه',
    'زعفرانیه',
    'تجریش',
    'ولنجک',
    'محمودیه',
    'اقدسیه',
    'آجودانیه',
    'سوهانک',
    'دارآباد',
    'منطقه ۱',
    'منطقه1',
    'فرشته',
  ],
  north_west: [
    'سعادت‌آباد',
    'سعادت اباد',
    'شهرک غرب',
    'کوی فراز',
    'فرهنگ',
    'بلوار دریا',
    'میدان کاج',
    'صرافها',
    'صراف‌های جنوبی',
    'گیشا',
    'ستارخان',
    'مرزداران',
    'صادقیه',
    'منطقه ۲',
    'منطقه2',
  ],
  north_east: [
    'پاسداران',
    'دروس',
    'قلهک',
    'میرداماد',
    'ظفر',
    'جردن',
    'ونک',
    'اختیاریه',
    'هروی',
    'منطقه ۳',
    'منطقه3',
  ],
  west: [
    'پونک',
    'جنت‌آباد',
    'جنت اباد',
    'باغ فیض',
    'سازمان برنامه',
    'فردوس',
    'بلوار فردوس',
    'صادقیه',
    'کاشانی',
    'ستاری',
    'منطقه ۵',
    'منطقه5',
    'چیتگر',
    'دریاچه',
    'منطقه ۲۲',
  ],
  center: [
    'یوسف‌آباد',
    'یوسف اباد',
    'امیرآباد',
    'امیراباد',
    'فاطمی',
    'سنایی',
    'کشاورز',
    'مطهری',
    'بهشتی',
    'منطقه ۶',
    'منطقه6',
  ],
  east: [
    'تهرانپارس',
    'نارمک',
    'هفت‌حوض',
    'پیروزی',
    'نیروهوایی',
    'منطقه ۴',
    'منطقه 8',
    'منطقه ۸',
  ],
};

function normalizeString(str?: string): string {
  if (!str) return '';
  return str
    .replace(/[ي]/g, 'ی')
    .replace(/[ك]/g, 'ک')
    .replace(/[٠-٩]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 1728))
    .replace(/[۰-۹]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 1776))
    .trim()
    .toLowerCase();
}

/**
 * 1. Transaction Type Scorer (Default weight: 10%)
 * Checks compatibility between sale, rent, presale.
 */
export function transactionTypeScore(
  property: Property,
  client: Client,
  weight = DEFAULT_MATCH_WEIGHTS.transactionType
): CriterionScore {
  const pDeal: DealType = property.transactionType || property.dealType;
  const cDeal: DealType = client.transactionType || client.desiredDealType;

  if (!cDeal) {
    return {
      criterion: 'transactionType',
      label: 'نوع معامله',
      weight,
      rawScore: 1.0,
      weightedScore: weight,
      quality: 'perfect',
      explanation: `✓ نوع معامله سازگار (${getDealTypeLabel(pDeal)})`,
      isPositive: true,
      isWeak: false,
    };
  }

  if (pDeal === cDeal) {
    return {
      criterion: 'transactionType',
      label: 'نوع معامله',
      weight,
      rawScore: 1.0,
      weightedScore: weight,
      quality: 'perfect',
      explanation: `✓ نوع معامله منطبق (${getDealTypeLabel(pDeal)})`,
      isPositive: true,
      isWeak: false,
    };
  }

  // Hard mismatch (e.g. rent vs sale)
  return {
    criterion: 'transactionType',
    label: 'نوع معامله',
    weight,
    rawScore: 0.0,
    weightedScore: 0,
    quality: 'mismatch',
    explanation: `✗ عدم انطباق نوع معامله (ملک: ${getDealTypeLabel(pDeal)} / تقاضا: ${getDealTypeLabel(cDeal)})`,
    isPositive: false,
    isWeak: true,
  };
}

/**
 * 2. Property Type Scorer (Default weight: 10%)
 * Checks compatibility between apartment, villa, office, etc.
 */
export function propertyTypeScore(
  property: Property,
  client: Client,
  weight = DEFAULT_MATCH_WEIGHTS.propertyType
): CriterionScore {
  const pType = property.propertyType;
  const cTypes = client.desiredPropertyTypes?.length
    ? client.desiredPropertyTypes
    : client.propertyType
    ? [client.propertyType]
    : [];

  if (cTypes.length === 0) {
    return {
      criterion: 'propertyType',
      label: 'نوع ملک',
      weight,
      rawScore: 1.0,
      weightedScore: weight,
      quality: 'perfect',
      explanation: `✓ نوع ملک (${getPropertyTypeLabel(pType)})`,
      isPositive: true,
      isWeak: false,
    };
  }

  if (cTypes.includes(pType)) {
    return {
      criterion: 'propertyType',
      label: 'نوع ملک',
      weight,
      rawScore: 1.0,
      weightedScore: weight,
      quality: 'perfect',
      explanation: `✓ نوع ملک منطبق (${getPropertyTypeLabel(pType)})`,
      isPositive: true,
      isWeak: false,
    };
  }

  // Partial match: e.g. penthouse & apartment
  if (
    (pType === 'penthouse' && cTypes.includes('apartment')) ||
    (pType === 'apartment' && cTypes.includes('penthouse'))
  ) {
    return {
      criterion: 'propertyType',
      label: 'نوع ملک',
      weight,
      rawScore: 0.7,
      weightedScore: weight * 0.7,
      quality: 'good',
      explanation: `✓ کاربری مسکونی مشابه (${getPropertyTypeLabel(pType)})`,
      isPositive: true,
      isWeak: false,
    };
  }

  // Mismatch
  return {
    criterion: 'propertyType',
    label: 'نوع ملک',
    weight,
    rawScore: 0.1,
    weightedScore: weight * 0.1,
    quality: 'poor',
    explanation: `△ نوع ملک غیرهمسان (${getPropertyTypeLabel(pType)} به جای ${cTypes.map(getPropertyTypeLabel).join(' یا ')})`,
    isPositive: false,
    isWeak: true,
  };
}

/**
 * 3. Location Scorer (Default weight: 20%)
 * Matches district, neighborhood, city, and adjacent geographic clusters.
 */
export function locationScore(
  property: Property,
  client: Client,
  weight = DEFAULT_MATCH_WEIGHTS.location
): CriterionScore {
  const pDistrict = property.neighborhood || property.district || '';
  const pCity = property.city || 'تهران';
  const cDistricts = client.preferredRegions?.length
    ? client.preferredRegions
    : client.desiredDistricts || [];
  const cCity = client.preferredCity || 'تهران';

  // Cross-city check
  if (cCity && pCity && normalizeString(cCity) !== normalizeString(pCity)) {
    return {
      criterion: 'location',
      label: 'محدوده جغرافیایی',
      weight,
      rawScore: 0.0,
      weightedScore: 0,
      quality: 'mismatch',
      explanation: `✗ شهر نامنطبق (ملک در ${pCity}، تقاضا در ${cCity})`,
      isPositive: false,
      isWeak: true,
    };
  }

  if (cDistricts.length === 0) {
    return {
      criterion: 'location',
      label: 'محدوده جغرافیایی',
      weight,
      rawScore: 1.0,
      weightedScore: weight,
      quality: 'perfect',
      explanation: `✓ موقعیت مکانی در محدوده مجاز (${pDistrict || pCity})`,
      isPositive: true,
      isWeak: false,
    };
  }

  const normPDistrict = normalizeString(pDistrict);

  // Exact or direct substring match
  for (const target of cDistricts) {
    const normTarget = normalizeString(target);
    if (
      normTarget.includes(normPDistrict) ||
      normPDistrict.includes(normTarget) ||
      (normTarget.includes('شمال') && (normPDistrict.includes('سعادت') || normPDistrict.includes('نیاوران') || normPDistrict.includes('پاسداران') || normPDistrict.includes('الهیه')))
    ) {
      return {
        criterion: 'location',
        label: 'محدوده جغرافیایی',
        weight,
        rawScore: 1.0,
        weightedScore: weight,
        quality: 'perfect',
        explanation: `✓ موقعیت در محله مورد تقاضا (${pDistrict})`,
        isPositive: true,
        isWeak: false,
      };
    }
  }

  // Geographic cluster / neighboring zone check
  let sameClusterFound = false;
  let clientClusterName = '';
  for (const [clusterKey, neighborhoods] of Object.entries(TEHRAN_CLUSTERS)) {
    const propertyInCluster = neighborhoods.some((n) => normPDistrict.includes(normalizeString(n)) || normalizeString(n).includes(normPDistrict));
    const clientInCluster = cDistricts.some((cd) => {
      const normCd = normalizeString(cd);
      return neighborhoods.some((n) => normCd.includes(normalizeString(n)) || normalizeString(n).includes(normCd));
    });

    if (propertyInCluster && clientInCluster) {
      sameClusterFound = true;
      break;
    }
    // Also consider North Tehran <-> North-West (Saadat Abad / Shahrak Gharb) as very close luxury neighbors
    const isNorthCross =
      (cDistricts.some((d) => normalizeString(d).includes('شمال')) || cDistricts.some((d) => normalizeString(d).includes('منطقه ۱'))) &&
      (normPDistrict.includes('سعادت') || normPDistrict.includes('شهرک غرب') || normPDistrict.includes('پاسداران'));
    if (isNorthCross) {
      sameClusterFound = true;
      break;
    }
  }

  if (sameClusterFound) {
    return {
      criterion: 'location',
      label: 'محدوده جغرافیایی',
      weight,
      rawScore: 0.9,
      weightedScore: weight * 0.9,
      quality: 'good',
      explanation: `✓ موقعیت در محدوده همجوار و منطقه مشابه (${pDistrict})`,
      isPositive: true,
      isWeak: false,
    };
  }

  // Different neighborhood in same city (partial score)
  return {
    criterion: 'location',
    label: 'محدوده جغرافیایی',
    weight,
    rawScore: 0.35,
    weightedScore: weight * 0.35,
    quality: 'fair',
    explanation: `△ موقعیت در محله متفاوت (${pDistrict} به جای ${cDistricts.join('، ')})`,
    isPositive: false,
    isWeak: true,
  };
}

/**
 * 4. Area Scorer (Default weight: 15%)
 * Continuous deviation penalty for properties smaller or larger than client preference.
 */
export function areaScore(
  property: Property,
  client: Client,
  weight = DEFAULT_MATCH_WEIGHTS.area
): CriterionScore {
  const pArea = property.area;
  const minArea = client.minArea;
  const maxArea = client.maxArea;

  if (!minArea && !maxArea) {
    return {
      criterion: 'area',
      label: 'متراژ',
      weight,
      rawScore: 1.0,
      weightedScore: weight,
      quality: 'perfect',
      explanation: `✓ متراژ مناسب (${toPersianDigits(pArea)} متر)`,
      isPositive: true,
      isWeak: false,
    };
  }

  // Both min and max defined (e.g. 80 - 100 sqm)
  if (minArea && maxArea) {
    if (pArea >= minArea && pArea <= maxArea) {
      return {
        criterion: 'area',
        label: 'متراژ',
        weight,
        rawScore: 1.0,
        weightedScore: weight,
        quality: 'perfect',
        explanation: `✓ متراژ دقیقاً در بازه درخواستی (${toPersianDigits(pArea)} متر در بازه ${toPersianDigits(minArea)} تا ${toPersianDigits(maxArea)})`,
        isPositive: true,
        isWeak: false,
      };
    }

    if (pArea > maxArea) {
      const deviation = (pArea - maxArea) / maxArea;
      if (deviation <= 0.12) {
        // e.g. 110m vs 100m -> deviation = 0.10
        const rawScore = 0.88;
        return {
          criterion: 'area',
          label: 'متراژ',
          weight,
          rawScore,
          weightedScore: weight * rawScore,
          quality: 'good',
          explanation: `△ متراژ کمی بیشتر از ترجیح مشتری (${toPersianDigits(pArea)} متر در برابر سقف ${toPersianDigits(maxArea)} متر)`,
          isPositive: false,
          isWeak: true,
        };
      } else if (deviation <= 0.25) {
        const rawScore = 0.65;
        return {
          criterion: 'area',
          label: 'متراژ',
          weight,
          rawScore,
          weightedScore: weight * rawScore,
          quality: 'fair',
          explanation: `△ متراژ بزرگتر از حد تقاضا (${toPersianDigits(pArea)} متر)`,
          isPositive: false,
          isWeak: true,
        };
      } else if (deviation <= 0.4) {
        const rawScore = 0.4;
        return {
          criterion: 'area',
          label: 'متراژ',
          weight,
          rawScore,
          weightedScore: weight * rawScore,
          quality: 'poor',
          explanation: `△ اختلاف قابل‌توجه در متراژ (${toPersianDigits(pArea)} متر)`,
          isPositive: false,
          isWeak: true,
        };
      } else {
        const rawScore = 0.15;
        return {
          criterion: 'area',
          label: 'متراژ',
          weight,
          rawScore,
          weightedScore: weight * rawScore,
          quality: 'poor',
          explanation: `✗ متراژ بسیار فراتر از نیاز متقاضی (${toPersianDigits(pArea)} متر)`,
          isPositive: false,
          isWeak: true,
        };
      }
    }

    if (pArea < minArea) {
      const deviation = (minArea - pArea) / minArea;
      if (deviation <= 0.1) {
        const rawScore = 0.8;
        return {
          criterion: 'area',
          label: 'متراژ',
          weight,
          rawScore,
          weightedScore: weight * rawScore,
          quality: 'good',
          explanation: `△ متراژ اندکی کمتر از حداقل خواسته (${toPersianDigits(pArea)} متر در برابر کف ${toPersianDigits(minArea)} متر)`,
          isPositive: false,
          isWeak: true,
        };
      } else if (deviation <= 0.25) {
        const rawScore = 0.55;
        return {
          criterion: 'area',
          label: 'متراژ',
          weight,
          rawScore,
          weightedScore: weight * rawScore,
          quality: 'fair',
          explanation: `△ متراژ کمتر از ترجیح مشتری (${toPersianDigits(pArea)} متر)`,
          isPositive: false,
          isWeak: true,
        };
      } else {
        const rawScore = 0.2;
        return {
          criterion: 'area',
          label: 'متراژ',
          weight,
          rawScore,
          weightedScore: weight * rawScore,
          quality: 'poor',
          explanation: `✗ متراژ به مراتب کوچکتر از حداقل مورد انتظار (${toPersianDigits(pArea)} متر)`,
          isPositive: false,
          isWeak: true,
        };
      }
    }
  }

  // Only minArea defined
  if (minArea && !maxArea) {
    if (pArea >= minArea && pArea <= minArea * 1.35) {
      return {
        criterion: 'area',
        label: 'متراژ',
        weight,
        rawScore: 1.0,
        weightedScore: weight,
        quality: 'perfect',
        explanation: `✓ متراژ مطابق با حداقل تقاضا (${toPersianDigits(pArea)} متر)`,
        isPositive: true,
        isWeak: false,
      };
    } else if (pArea > minArea * 1.35) {
      return {
        criterion: 'area',
        label: 'متراژ',
        weight,
        rawScore: 0.8,
        weightedScore: weight * 0.8,
        quality: 'good',
        explanation: `✓ متراژ بالاتر از حداقل مورد نظر (${toPersianDigits(pArea)} متر)`,
        isPositive: true,
        isWeak: false,
      };
    } else {
      const deviation = (minArea - pArea) / minArea;
      const rawScore = Math.max(0.1, 1 - deviation * 2.5);
      return {
        criterion: 'area',
        label: 'متراژ',
        weight,
        rawScore,
        weightedScore: weight * rawScore,
        quality: rawScore > 0.6 ? 'fair' : 'poor',
        explanation: `△ متراژ کمتر از حداقل (${toPersianDigits(pArea)} متر به جای ${toPersianDigits(minArea)})`,
        isPositive: false,
        isWeak: true,
      };
    }
  }

  // Only maxArea defined
  if (!minArea && maxArea) {
    if (pArea <= maxArea) {
      return {
        criterion: 'area',
        label: 'متراژ',
        weight,
        rawScore: 1.0,
        weightedScore: weight,
        quality: 'perfect',
        explanation: `✓ متراژ زیر سقف خواسته (${toPersianDigits(pArea)} متر)`,
        isPositive: true,
        isWeak: false,
      };
    } else {
      const deviation = (pArea - maxArea) / maxArea;
      const rawScore = Math.max(0.1, 1 - deviation * 2.5);
      return {
        criterion: 'area',
        label: 'متراژ',
        weight,
        rawScore,
        weightedScore: weight * rawScore,
        quality: rawScore > 0.6 ? 'fair' : 'poor',
        explanation: `△ متراژ بیش از سقف (${toPersianDigits(pArea)} متر به جای ${toPersianDigits(maxArea)})`,
        isPositive: false,
        isWeak: true,
      };
    }
  }

  return {
    criterion: 'area',
    label: 'متراژ',
    weight,
    rawScore: 1.0,
    weightedScore: weight,
    quality: 'perfect',
    explanation: `✓ متراژ مطلوب (${toPersianDigits(pArea)} متر)`,
    isPositive: true,
    isWeak: false,
  };
}

/**
 * 5. Budget Scorer (Default weight: 25%)
 * For Sale: Evaluates property price vs min & max budget with partial overage deviation penalty.
 * For Rent: Evaluates deposit & monthly rent.
 */
export function budgetScore(
  property: Property,
  client: Client,
  weight = DEFAULT_MATCH_WEIGHTS.budget
): CriterionScore {
  const pDeal = property.transactionType || property.dealType;

  if (pDeal === 'rent') {
    const pDeposit = property.deposit ?? property.depositPrice ?? 0;
    const pRent = property.monthlyRent ?? property.rent ?? property.rentPrice ?? 0;
    const cMaxDeposit = client.maxDeposit;
    const cMaxRent = client.maxMonthlyRent;

    if (!cMaxDeposit && !cMaxRent) {
      return {
        criterion: 'budget',
        label: 'بودجه',
        weight,
        rawScore: 1.0,
        weightedScore: weight,
        quality: 'perfect',
        explanation: '✓ شرایط مالی رهن و اجاره مناسب',
        isPositive: true,
        isWeak: false,
      };
    }

    let depositScore = 1.0;
    let rentScore = 1.0;

    if (cMaxDeposit && pDeposit > cMaxDeposit) {
      const dev = (pDeposit - cMaxDeposit) / cMaxDeposit;
      depositScore = dev <= 0.1 ? 0.8 : dev <= 0.25 ? 0.5 : 0.1;
    }
    if (cMaxRent && pRent > cMaxRent) {
      const dev = (pRent - cMaxRent) / cMaxRent;
      rentScore = dev <= 0.1 ? 0.8 : dev <= 0.25 ? 0.5 : 0.1;
    }

    const avgScore = (depositScore + rentScore) / 2;
    if (avgScore >= 0.95) {
      return {
        criterion: 'budget',
        label: 'بودجه',
        weight,
        rawScore: avgScore,
        weightedScore: weight * avgScore,
        quality: 'perfect',
        explanation: '✓ ودیعه و اجاره در توان مالی مستاجر',
        isPositive: true,
        isWeak: false,
      };
    } else if (avgScore >= 0.7) {
      return {
        criterion: 'budget',
        label: 'بودجه',
        weight,
        rawScore: avgScore,
        weightedScore: weight * avgScore,
        quality: 'good',
        explanation: '△ ودیعه یا اجاره اندکی بالاتر از سقف بودجه (قابل تبدیل و مذاکره)',
        isPositive: false,
        isWeak: true,
      };
    } else {
      return {
        criterion: 'budget',
        label: 'بودجه',
        weight,
        rawScore: avgScore,
        weightedScore: weight * avgScore,
        quality: 'poor',
        explanation: '✗ مبالغ رهن و اجاره فراتر از بودجه اعلامی مستاجر',
        isPositive: false,
        isWeak: true,
      };
    }
  }

  // Sale / Presale
  const pPrice = property.totalPrice ?? property.price ?? 0;
  const cMax = client.maxBudget ?? client.budgetMax;
  const cMin = client.minBudget ?? client.budgetMin ?? 0;

  if (!cMax && !cMin) {
    return {
      criterion: 'budget',
      label: 'بودجه',
      weight,
      rawScore: 1.0,
      weightedScore: weight,
      quality: 'perfect',
      explanation: `✓ قیمت ملک (${formatPriceToman(pPrice)})`,
      isPositive: true,
      isWeak: false,
    };
  }

  if (pPrice <= 0) {
    return {
      criterion: 'budget',
      label: 'بودجه',
      weight,
      rawScore: 0.5,
      weightedScore: weight * 0.5,
      quality: 'fair',
      explanation: '△ قیمت ملک هنوز مشخص نشده است',
      isPositive: false,
      isWeak: true,
    };
  }

  // Client specified max budget
  if (cMax) {
    if (pPrice <= cMax) {
      if (cMin && pPrice < cMin) {
        // Price is cheaper than min budget
        const rawScore = pPrice >= cMin * 0.8 ? 0.95 : 0.85;
        return {
          criterion: 'budget',
          label: 'بودجه',
          weight,
          rawScore,
          weightedScore: weight * rawScore,
          quality: 'good',
          explanation: `✓ قیمت پایین‌تر از برآورد خریدار (${formatPriceToman(pPrice)})`,
          isPositive: true,
          isWeak: false,
        };
      }

      return {
        criterion: 'budget',
        label: 'بودجه',
        weight,
        rawScore: 1.0,
        weightedScore: weight,
        quality: 'perfect',
        explanation: `✓ قیمت ملک کاملاً در محدوده بودجه متقاضی (${formatPriceToman(pPrice)})`,
        isPositive: true,
        isWeak: false,
      };
    }

    // pPrice > cMax: Calculate deviation penalty
    const deviation = (pPrice - cMax) / cMax;

    if (deviation <= 0.05) {
      // within 5% over budget - easily negotiable in Iranian real estate market
      const rawScore = 0.85;
      return {
        criterion: 'budget',
        label: 'بودجه',
        weight,
        rawScore,
        weightedScore: weight * rawScore,
        quality: 'good',
        explanation: `△ قیمت حدود ۵٪ بیش از سقف بودجه (قابل مذاکره و تخفیف)`,
        isPositive: false,
        isWeak: true,
      };
    } else if (deviation <= 0.12) {
      // 5% - 12% over budget
      const rawScore = 0.7;
      return {
        criterion: 'budget',
        label: 'بودجه',
        weight,
        rawScore,
        weightedScore: weight * rawScore,
        quality: 'fair',
        explanation: `△ قیمت ۱۰٪ فراتر از سقف بودجه اعلامی (${formatPriceToman(pPrice)})`,
        isPositive: false,
        isWeak: true,
      };
    } else if (deviation <= 0.22) {
      // 12% - 22% over budget
      const rawScore = 0.4;
      return {
        criterion: 'budget',
        label: 'بودجه',
        weight,
        rawScore,
        weightedScore: weight * rawScore,
        quality: 'poor',
        explanation: `△ قیمت ۲۰٪ بالاتر از توان مالی فعلی خریدار`,
        isPositive: false,
        isWeak: true,
      };
    } else {
      const rawScore = 0.0;
      return {
        criterion: 'budget',
        label: 'بودجه',
        weight,
        rawScore,
        weightedScore: 0,
        quality: 'mismatch',
        explanation: `✗ قیمت بسیار فراتر از سقف بودجه اعلامی خریدار`,
        isPositive: false,
        isWeak: true,
      };
    }
  }

  // Only min budget provided
  if (pPrice >= cMin) {
    return {
      criterion: 'budget',
      label: 'بودجه',
      weight,
      rawScore: 1.0,
      weightedScore: weight,
      quality: 'perfect',
      explanation: `✓ قیمت متناسب با حداقل بودجه (${formatPriceToman(pPrice)})`,
      isPositive: true,
      isWeak: false,
    };
  }

  return {
    criterion: 'budget',
    label: 'بودجه',
    weight,
    rawScore: 0.7,
    weightedScore: weight * 0.7,
    quality: 'fair',
    explanation: `△ قیمت کمتر از حداقل اعلامی (${formatPriceToman(pPrice)})`,
    isPositive: false,
    isWeak: true,
  };
}

/**
 * 6. Bedroom Scorer (Default weight: 10%)
 */
export function bedroomScore(
  property: Property,
  client: Client,
  weight = DEFAULT_MATCH_WEIGHTS.bedrooms
): CriterionScore {
  const pBed = property.bedrooms;
  const cBed = client.bedrooms ?? client.minBedrooms;

  if (cBed === undefined || cBed === null) {
    return {
      criterion: 'bedrooms',
      label: 'تعداد خواب',
      weight,
      rawScore: 1.0,
      weightedScore: weight,
      quality: 'perfect',
      explanation: `✓ تعداد خواب (${toPersianDigits(pBed)} خوابه)`,
      isPositive: true,
      isWeak: false,
    };
  }

  if (pBed === cBed) {
    return {
      criterion: 'bedrooms',
      label: 'تعداد خواب',
      weight,
      rawScore: 1.0,
      weightedScore: weight,
      quality: 'perfect',
      explanation: `✓ تعداد خواب منطبق (${toPersianDigits(pBed)} خوابه)`,
      isPositive: true,
      isWeak: false,
    };
  }

  if (pBed === cBed + 1) {
    return {
      criterion: 'bedrooms',
      label: 'تعداد خواب',
      weight,
      rawScore: 0.9,
      weightedScore: weight * 0.9,
      quality: 'good',
      explanation: `✓ یک خواب بیشتر از تقاضا (${toPersianDigits(pBed)} خوابه)`,
      isPositive: true,
      isWeak: false,
    };
  }

  if (pBed > cBed + 1) {
    return {
      criterion: 'bedrooms',
      label: 'تعداد خواب',
      weight,
      rawScore: 0.75,
      weightedScore: weight * 0.75,
      quality: 'fair',
      explanation: `△ تعداد خواب فراتر از نیاز مشتری (${toPersianDigits(pBed)} خوابه)`,
      isPositive: false,
      isWeak: true,
    };
  }

  if (pBed === cBed - 1) {
    return {
      criterion: 'bedrooms',
      label: 'تعداد خواب',
      weight,
      rawScore: 0.45,
      weightedScore: weight * 0.45,
      quality: 'poor',
      explanation: `△ یک خواب کمتر از ترجیح مشتری (${toPersianDigits(pBed)} به جای ${toPersianDigits(cBed)})`,
      isPositive: false,
      isWeak: true,
    };
  }

  return {
    criterion: 'bedrooms',
    label: 'تعداد خواب',
    weight,
    rawScore: 0.15,
    weightedScore: weight * 0.15,
    quality: 'mismatch',
    explanation: `✗ کمبود تعداد خواب (${toPersianDigits(pBed)} به جای حداقل ${toPersianDigits(cBed)} خواب)`,
    isPositive: false,
    isWeak: true,
  };
}

/**
 * 7. Features Scorer (Default weight: 10%)
 * Checks elevator, parking, storage, balcony, plus customized requirements vs features.
 */
export function featureScore(
  property: Property,
  client: Client,
  weight = DEFAULT_MATCH_WEIGHTS.features
): CriterionScore {
  let score = 1.0;
  const matchedPerks: string[] = [];
  const missingPerks: string[] = [];

  // Elevator
  if (client.mustHaveElevator) {
    if (property.elevator) {
      matchedPerks.push('آسانسور');
    } else {
      score -= 0.35;
      missingPerks.push('فاقد آسانسور مورد نیاز');
    }
  } else if (property.elevator) {
    matchedPerks.push('آسانسور');
  }

  // Parking
  if (client.mustHaveParking) {
    if (property.parking) {
      matchedPerks.push('پارکینگ');
    } else {
      score -= 0.45;
      missingPerks.push('فاقد پارکینگ مورد نیاز');
    }
  } else if (property.parking) {
    matchedPerks.push('پارکینگ');
  }

  if (property.storage) matchedPerks.push('انباری');
  if (property.balcony) matchedPerks.push('تراس/بالکن');

  // Custom client requirements vs property features
  const clientReqs = client.requirements || [];
  const propFeatures = property.features || [];

  if (clientReqs.length > 0) {
    let reqMatches = 0;
    for (const req of clientReqs) {
      const normReq = normalizeString(req);
      const hasReq = propFeatures.some((pf) => normalizeString(pf).includes(normReq) || normReq.includes(normalizeString(pf)));
      if (hasReq) {
        reqMatches++;
        matchedPerks.push(req);
      } else {
        missingPerks.push(`فاقد ${req}`);
      }
    }
    const reqRatio = reqMatches / clientReqs.length;
    score = score * 0.4 + reqRatio * 0.6;
  }

  const rawScore = Math.max(0.05, Math.min(1.0, score));
  const weightedScore = weight * rawScore;

  if (rawScore >= 0.85) {
    const perksText = matchedPerks.slice(0, 3).join('، ');
    return {
      criterion: 'features',
      label: 'امکانات',
      weight,
      rawScore,
      weightedScore,
      quality: 'perfect',
      explanation: `✓ دارای امکانات کلیدی (${perksText || 'امکانات کامل'})`,
      isPositive: true,
      isWeak: false,
    };
  } else if (rawScore >= 0.6) {
    return {
      criterion: 'features',
      label: 'امکانات',
      weight,
      rawScore,
      weightedScore,
      quality: 'good',
      explanation: `✓ امکانات اصلی مهیا (${matchedPerks.slice(0, 2).join('، ')})`,
      isPositive: true,
      isWeak: false,
    };
  } else {
    return {
      criterion: 'features',
      label: 'امکانات',
      weight,
      rawScore,
      weightedScore,
      quality: 'poor',
      explanation: `△ ${missingPerks[0] || 'برخی امکانات مورد انتظار ناموجود است'}`,
      isPositive: false,
      isWeak: true,
    };
  }
}

/**
 * Composite Match Calculation Engine
 * Combines all unit-testable criteria deterministically.
 */
export function calculateMatchCompatibility(
  property: Property,
  client: Client,
  weights: MatchWeights = DEFAULT_MATCH_WEIGHTS
): MatchCalculationResult {
  // Disregard archived or unavailable items
  if (
    property.status === 'archived' ||
    property.availabilityStatus === 'archived' ||
    client.status === 'archived'
  ) {
    return {
      score: 0,
      isViable: false,
      criteria: {} as any,
      matchedFactors: [],
      weakFactors: ['یکی از طرفین بایگانی شده است'],
      summary: 'غیرفعال / بایگانی‌شده',
    };
  }

  // If property is already sold or rented, it cannot be matched
  if (property.availabilityStatus === 'sold' || property.availabilityStatus === 'rented') {
    return {
      score: 0,
      isViable: false,
      criteria: {} as any,
      matchedFactors: [],
      weakFactors: ['ملک واگذار شده است'],
      summary: 'واگذار شده',
    };
  }

  // Calculate each criterion score
  const txResult = transactionTypeScore(property, client, weights.transactionType);
  const propTypeResult = propertyTypeScore(property, client, weights.propertyType);
  const locResult = locationScore(property, client, weights.location);
  const areaResult = areaScore(property, client, weights.area);
  const budgetResult = budgetScore(property, client, weights.budget);
  const bedResult = bedroomScore(property, client, weights.bedrooms);
  const featResult = featureScore(property, client, weights.features);

  const criteriaRecord: Record<keyof MatchWeights, CriterionScore> = {
    transactionType: txResult,
    propertyType: propTypeResult,
    location: locResult,
    area: areaResult,
    budget: budgetResult,
    bedrooms: bedResult,
    features: featResult,
  };

  // If transaction type is an absolute mismatch (e.g. rent vs sale),
  // in real-world CRM you cannot sell to a renter. Hard cap at 0 or max 15%.
  if (txResult.quality === 'mismatch') {
    return {
      score: 10,
      isViable: false,
      criteria: criteriaRecord,
      matchedFactors: [],
      weakFactors: [txResult.explanation],
      summary: 'عدم تطابق نوع معامله (خرید در برابر رهن/اجاره)',
    };
  }

  // Sum weighted scores
  let totalScore =
    txResult.weightedScore +
    propTypeResult.weightedScore +
    locResult.weightedScore +
    areaResult.weightedScore +
    budgetResult.weightedScore +
    bedResult.weightedScore +
    featResult.weightedScore;

  // Round deterministically to integer 0 - 100
  const finalScore = Math.min(100, Math.max(0, Math.round(totalScore)));

  // Collect explanations
  const matchedFactors: string[] = [];
  const weakFactors: string[] = [];

  const orderedCriteria = [budgetResult, locResult, areaResult, txResult, propTypeResult, bedResult, featResult];
  for (const c of orderedCriteria) {
    if (c.isPositive) {
      matchedFactors.push(c.explanation);
    } else if (c.isWeak) {
      weakFactors.push(c.explanation);
    }
  }

  // Reserved property advisory
  if (property.availabilityStatus === 'reserved') {
    weakFactors.unshift('△ ملک در حال حاضر در وضعیت رزرو قرار دارد');
  }

  return {
    score: finalScore,
    isViable: finalScore >= 50,
    criteria: criteriaRecord,
    matchedFactors,
    weakFactors,
    summary: `${toPersianDigits(finalScore)}٪ تطابق کلی`,
  };
}
