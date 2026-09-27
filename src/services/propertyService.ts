import { Property, DealType, PropertyType, PropertyStatus, AvailabilityStatus, PrivacyStatus, User } from '../types';
import { storageService } from './storageService';

export type PropertySortOption = 'newest' | 'price_asc' | 'price_desc' | 'area_asc' | 'area_desc';

export interface PropertyFilters {
  dealType?: DealType | 'all';
  transactionType?: DealType | 'all';
  propertyType?: PropertyType | 'all';
  status?: PropertyStatus | 'all';
  availability?: AvailabilityStatus | 'all';
  privacyStatus?: PrivacyStatus | 'all';
  city?: string;
  region?: string;
  district?: string;
  neighborhood?: string;
  minPrice?: number;
  maxPrice?: number;
  minArea?: number;
  maxArea?: number;
  bedrooms?: number | 'all';
  search?: string;
  includeArchived?: boolean;
  sortBy?: PropertySortOption;
}

export const propertyService = {
  async getAll(filters?: PropertyFilters, currentUser?: User | null): Promise<Property[]> {
    let properties = await storageService.getProperties(currentUser);

    // Default: exclude archived unless explicitly requested
    if (!filters?.includeArchived && (!filters?.status || filters.status !== 'archived') && (!filters?.availability || filters.availability !== 'archived')) {
      properties = properties.filter((p) => p.status !== 'archived' && p.availabilityStatus !== 'archived');
    }

    if (!filters) return properties;

    // Transaction / Deal Type
    const transType = filters.transactionType || filters.dealType;
    if (transType && transType !== 'all') {
      properties = properties.filter((p) => (p.transactionType || p.dealType) === transType);
    }

    // Property Type
    if (filters.propertyType && filters.propertyType !== 'all') {
      properties = properties.filter((p) => p.propertyType === filters.propertyType);
    }

    // Status / Availability
    if (filters.availability && filters.availability !== 'all') {
      properties = properties.filter((p) => (p.availabilityStatus || p.status) === filters.availability);
    } else if (filters.status && filters.status !== 'all') {
      properties = properties.filter((p) => p.status === filters.status);
    }

    // Privacy
    if (filters.privacyStatus && filters.privacyStatus !== 'all') {
      properties = properties.filter((p) => (p.privacyStatus || p.privacyState) === filters.privacyStatus);
    }

    // City
    if (filters.city && filters.city.trim() !== '') {
      properties = properties.filter((p) => p.city && p.city.toLowerCase().includes(filters.city!.trim().toLowerCase()));
    }

    // Region / District / Neighborhood
    const locationQuery = filters.neighborhood || filters.district || filters.region;
    if (locationQuery && locationQuery !== 'all' && locationQuery.trim() !== '') {
      const lq = locationQuery.trim().toLowerCase();
      properties = properties.filter((p) =>
        (p.district && p.district.toLowerCase().includes(lq)) ||
        (p.neighborhood && p.neighborhood.toLowerCase().includes(lq)) ||
        (p.region && p.region.toLowerCase().includes(lq))
      );
    }

    // Bedrooms
    if (filters.bedrooms && filters.bedrooms !== 'all') {
      properties = properties.filter((p) => p.bedrooms === Number(filters.bedrooms));
    }

    // Area range
    if (filters.minArea !== undefined && filters.minArea > 0) {
      properties = properties.filter((p) => p.area >= filters.minArea!);
    }
    if (filters.maxArea !== undefined && filters.maxArea > 0) {
      properties = properties.filter((p) => p.area <= filters.maxArea!);
    }

    // Price range (deals with sale price or rent deposit)
    if (filters.minPrice !== undefined && filters.minPrice > 0) {
      properties = properties.filter((p) => {
        const pVal = p.price ?? p.totalPrice ?? p.deposit ?? 0;
        return pVal >= filters.minPrice!;
      });
    }
    if (filters.maxPrice !== undefined && filters.maxPrice > 0) {
      properties = properties.filter((p) => {
        const pVal = p.price ?? p.totalPrice ?? p.deposit ?? 0;
        return pVal <= filters.maxPrice!;
      });
    }

    // Search query
    if (filters.search && filters.search.trim() !== '') {
      const q = filters.search.trim().toLowerCase();
      properties = properties.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.code.toLowerCase().includes(q) ||
          p.district.toLowerCase().includes(q) ||
          (p.neighborhood && p.neighborhood.toLowerCase().includes(q)) ||
          p.ownerName.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          (p.features && p.features.some((f) => f.toLowerCase().includes(q)))
      );
    }

    // Sorting
    const sortBy = filters.sortBy || 'newest';
    properties = [...properties].sort((a, b) => {
      if (sortBy === 'price_asc') {
        const priceA = a.price ?? a.totalPrice ?? a.deposit ?? 0;
        const priceB = b.price ?? b.totalPrice ?? b.deposit ?? 0;
        return priceA - priceB;
      }
      if (sortBy === 'price_desc') {
        const priceA = a.price ?? a.totalPrice ?? a.deposit ?? 0;
        const priceB = b.price ?? b.totalPrice ?? b.deposit ?? 0;
        return priceB - priceA;
      }
      if (sortBy === 'area_asc') {
        return a.area - b.area;
      }
      if (sortBy === 'area_desc') {
        return b.area - a.area;
      }
      // 'newest' by default
      return (b.id || '').localeCompare(a.id || '');
    });

    return properties;
  },

  async getById(id: string, currentUser?: User | null): Promise<Property | null> {
    return storageService.getPropertyById(id, currentUser);
  },

  async create(
    data: Omit<Property, 'id' | 'createdAt' | 'updatedAt' | 'code' | 'ownerId'>,
    currentUser?: User | null
  ): Promise<Property> {
    return storageService.createProperty(data, currentUser);
  },

  async update(id: string, updates: Partial<Property>, currentUser?: User | null): Promise<Property | null> {
    return storageService.updateProperty(id, updates, currentUser);
  },

  async archive(id: string, currentUser?: User | null): Promise<Property | null> {
    return storageService.archiveProperty(id, currentUser);
  },

  async restore(id: string, currentUser?: User | null): Promise<Property | null> {
    return storageService.restoreProperty(id, currentUser);
  },

  async updateAvailability(
    id: string,
    availability: AvailabilityStatus,
    currentUser?: User | null
  ): Promise<Property | null> {
    return storageService.updatePropertyAvailability(id, availability, currentUser);
  },

  async addNote(id: string, noteText: string, currentUser?: User | null): Promise<Property | null> {
    return storageService.addPropertyNote(id, noteText, currentUser);
  },

  async addMedia(id: string, mediaUrls: string[], currentUser?: User | null): Promise<Property | null> {
    return storageService.addPropertyMedia(id, mediaUrls, currentUser);
  },

  async togglePrivacy(id: string, currentUser?: User | null): Promise<Property | null> {
    return storageService.togglePropertyPrivacy(id, currentUser);
  },
};
