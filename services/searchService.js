const PG = require('../models/PG');

class SearchService {
  constructor() {
    this.searchHistory = new Map();
    this.popularSearches = new Map();
  }

  async intelligentSearch(query, filters = {}, userId = null) {
    try {
      // Build search pipeline
      const pipeline = this.buildSearchPipeline(query, filters);
      
      // Execute search
      const results = await PG.aggregate(pipeline);
      
      // Track search analytics
      this.trackSearch(query, results.length, userId);
      
      // Apply AI ranking
      const rankedResults = this.applyAIRanking(results, query, userId);
      
      return {
        results: rankedResults,
        total: results.length,
        suggestions: await this.getSearchSuggestions(query),
        trending: this.getTrendingSearches()
      };
    } catch (error) {
      console.error('Search error:', error);
      throw error;
    }
  }

  buildSearchPipeline(query, filters) {
    const pipeline = [];
    
    // Match stage - basic filters
    const matchStage = {
      isApproved: true,
      isActive: true
    };

    // Text search
    if (query) {
      matchStage.$or = [
        { name: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
        { 'location.address': { $regex: query, $options: 'i' } },
        { 'location.city': { $regex: query, $options: 'i' } }
      ];
    }

    // Location filter
    if (filters.city) {
      matchStage['location.city'] = { $regex: filters.city, $options: 'i' };
    }

    // Price range filter
    if (filters.minPrice || filters.maxPrice) {
      const priceFilter = {};
      if (filters.minPrice) priceFilter.$gte = parseInt(filters.minPrice);
      if (filters.maxPrice) priceFilter.$lte = parseInt(filters.maxPrice);
      matchStage['roomTypes.price'] = priceFilter;
    }

    // Amenities filter
    Object.keys(filters).forEach(key => {
      if (key.startsWith('amenities.') && filters[key] === 'true') {
        matchStage[key] = true;
      }
    });

    pipeline.push({ $match: matchStage });

    // Add calculated fields
    pipeline.push({
      $addFields: {
        searchScore: {
          $add: [
            { $multiply: ['$rating.overall', 2] },
            { $multiply: ['$reviewCount', 0.1] },
            { $multiply: ['$bookingCount', 0.05] },
            { $cond: [{ $eq: ['$isFeatured', true] }, 3, 0] }
          ]
        },
        relevanceScore: query ? {
          $add: [
            { $cond: [{ $regexMatch: { input: '$name', regex: query, options: 'i' } }, 5, 0] },
            { $cond: [{ $regexMatch: { input: '$location.city', regex: query, options: 'i' } }, 3, 0] },
            { $cond: [{ $regexMatch: { input: '$description', regex: query, options: 'i' } }, 1, 0] }
          ]
        } : 0
      }
    });

    // Sort by relevance and rating
    pipeline.push({
      $sort: {
        relevanceScore: -1,
        searchScore: -1,
        'rating.overall': -1,
        createdAt: -1
      }
    });

    // Populate owner info
    pipeline.push({
      $lookup: {
        from: 'users',
        localField: 'owner',
        foreignField: '_id',
        as: 'ownerInfo'
      }
    });

    return pipeline;
  }

  applyAIRanking(results, query, userId) {
    // Simple AI ranking based on user preferences and behavior
    return results.map(pg => {
      let aiScore = pg.searchScore || 0;
      
      // Boost based on user's previous bookings (if available)
      if (userId && this.getUserPreferences(userId)) {
        const prefs = this.getUserPreferences(userId);
        if (prefs.preferredCity === pg.location.city) aiScore += 2;
        if (prefs.preferredPriceRange && 
            pg.averagePrice >= prefs.preferredPriceRange.min && 
            pg.averagePrice <= prefs.preferredPriceRange.max) {
          aiScore += 1;
        }
      }
      
      // Boost trending PGs
      if (this.isTrending(pg._id)) aiScore += 1;
      
      return { ...pg, aiScore };
    }).sort((a, b) => b.aiScore - a.aiScore);
  }

  async getSearchSuggestions(query) {
    if (!query || query.length < 2) return [];
    
    const suggestions = await PG.aggregate([
      {
        $match: {
          isApproved: true,
          isActive: true,
          $or: [
            { 'location.city': { $regex: query, $options: 'i' } },
            { name: { $regex: query, $options: 'i' } }
          ]
        }
      },
      {
        $group: {
          _id: null,
          cities: { $addToSet: '$location.city' },
          names: { $addToSet: '$name' }
        }
      }
    ]);

    if (suggestions.length === 0) return [];
    
    const { cities, names } = suggestions[0];
    return [...cities, ...names].slice(0, 5);
  }

  trackSearch(query, resultCount, userId) {
    const searchData = {
      query: query.toLowerCase(),
      resultCount,
      userId,
      timestamp: new Date()
    };
    
    // Update search history
    if (!this.searchHistory.has(query)) {
      this.searchHistory.set(query, []);
    }
    this.searchHistory.get(query).push(searchData);
    
    // Update popular searches
    const count = this.popularSearches.get(query) || 0;
    this.popularSearches.set(query, count + 1);
  }

  getTrendingSearches() {
    return Array.from(this.popularSearches.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([query]) => query);
  }

  getUserPreferences(userId) {
    // Mock user preferences - in real app, fetch from database
    return {
      preferredCity: 'Indore',
      preferredPriceRange: { min: 8000, max: 15000 },
      preferredAmenities: ['wifi', 'food', 'parking']
    };
  }

  isTrending(pgId) {
    // Mock trending logic - in real app, analyze recent bookings/views
    return Math.random() > 0.8;
  }

  async getSearchAnalytics() {
    const totalSearches = Array.from(this.searchHistory.values())
      .reduce((sum, searches) => sum + searches.length, 0);
    
    const uniqueQueries = this.searchHistory.size;
    const avgResultsPerSearch = totalSearches > 0 ? 
      Array.from(this.searchHistory.values())
        .flat()
        .reduce((sum, search) => sum + search.resultCount, 0) / totalSearches : 0;
    
    return {
      totalSearches,
      uniqueQueries,
      avgResultsPerSearch: Math.round(avgResultsPerSearch),
      topQueries: this.getTrendingSearches(),
      searchTrends: this.getSearchTrends()
    };
  }

  getSearchTrends() {
    const now = new Date();
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const recentSearches = Array.from(this.searchHistory.values())
      .flat()
      .filter(search => search.timestamp >= last7Days);
    
    const dailySearches = {};
    recentSearches.forEach(search => {
      const day = search.timestamp.toDateString();
      dailySearches[day] = (dailySearches[day] || 0) + 1;
    });
    
    return Object.entries(dailySearches)
      .map(([date, count]) => ({ date, searches: count }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }
}

module.exports = new SearchService();