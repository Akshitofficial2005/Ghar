const User = require('../models/User');
const PG = require('../models/PG');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');

class AnalyticsService {
  async getDashboardMetrics() {
    const [
      userStats,
      pgStats,
      bookingStats,
      revenueStats,
      conversionStats
    ] = await Promise.all([
      this.getUserStats(),
      this.getPGStats(),
      this.getBookingStats(),
      this.getRevenueStats(),
      this.getConversionStats()
    ]);

    return {
      users: userStats,
      pgs: pgStats,
      bookings: bookingStats,
      revenue: revenueStats,
      conversion: conversionStats,
      trends: await this.getTrends()
    };
  }

  async getUserStats() {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ 
      lastLogin: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    });
    const newUsersThisMonth = await User.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    });

    const userGrowth = await User.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      { $limit: 12 }
    ]);

    return {
      total: totalUsers,
      active: activeUsers,
      newThisMonth: newUsersThisMonth,
      growth: userGrowth,
      retentionRate: activeUsers > 0 ? (activeUsers / totalUsers * 100).toFixed(1) : 0
    };
  }

  async getPGStats() {
    const totalPGs = await PG.countDocuments();
    const approvedPGs = await PG.countDocuments({ isApproved: true });
    const activePGs = await PG.countDocuments({ isApproved: true, isActive: true });
    const pendingApproval = await PG.countDocuments({ isApproved: false });

    const pgsByCity = await PG.aggregate([
      { $match: { isApproved: true, isActive: true } },
      {
        $group: {
          _id: '$location.city',
          count: { $sum: 1 },
          avgRating: { $avg: '$rating.overall' },
          totalBookings: { $sum: '$bookingCount' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    return {
      total: totalPGs,
      approved: approvedPGs,
      active: activePGs,
      pending: pendingApproval,
      approvalRate: totalPGs > 0 ? (approvedPGs / totalPGs * 100).toFixed(1) : 0,
      byCity: pgsByCity
    };
  }

  async getBookingStats() {
    const totalBookings = await Booking.countDocuments();
    const confirmedBookings = await Booking.countDocuments({ status: 'confirmed' });
    const cancelledBookings = await Booking.countDocuments({ status: 'cancelled' });
    const pendingBookings = await Booking.countDocuments({ status: 'pending' });

    const bookingTrends = await Booking.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          bookings: { $sum: 1 },
          revenue: { $sum: '$totalAmount' },
          avgBookingValue: { $avg: '$totalAmount' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      { $limit: 12 }
    ]);

    return {
      total: totalBookings,
      confirmed: confirmedBookings,
      cancelled: cancelledBookings,
      pending: pendingBookings,
      confirmationRate: totalBookings > 0 ? (confirmedBookings / totalBookings * 100).toFixed(1) : 0,
      cancellationRate: totalBookings > 0 ? (cancelledBookings / totalBookings * 100).toFixed(1) : 0,
      trends: bookingTrends
    };
  }

  async getRevenueStats() {
    const totalRevenue = await Payment.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const monthlyRevenue = await Payment.aggregate([
      { $match: { status: 'completed' } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          revenue: { $sum: '$amount' },
          transactions: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      { $limit: 12 }
    ]);

    const avgTransactionValue = await Payment.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, avg: { $avg: '$amount' } } }
    ]);

    return {
      total: totalRevenue[0]?.total || 0,
      monthly: monthlyRevenue,
      avgTransaction: avgTransactionValue[0]?.avg || 0,
      growth: this.calculateGrowthRate(monthlyRevenue)
    };
  }

  async getConversionStats() {
    // Mock conversion funnel data
    const pageViews = 15000;
    const searches = 8500;
    const pgViews = 4200;
    const bookingAttempts = 850;
    const completedBookings = 680;

    return {
      funnel: [
        { stage: 'Page Views', count: pageViews, rate: 100 },
        { stage: 'Searches', count: searches, rate: (searches/pageViews*100).toFixed(1) },
        { stage: 'PG Views', count: pgViews, rate: (pgViews/searches*100).toFixed(1) },
        { stage: 'Booking Attempts', count: bookingAttempts, rate: (bookingAttempts/pgViews*100).toFixed(1) },
        { stage: 'Completed Bookings', count: completedBookings, rate: (completedBookings/bookingAttempts*100).toFixed(1) }
      ],
      overallConversion: (completedBookings/pageViews*100).toFixed(2)
    };
  }

  async getTrends() {
    const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const last60Days = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

    const [currentPeriod, previousPeriod] = await Promise.all([
      this.getPeriodStats(last30Days, new Date()),
      this.getPeriodStats(last60Days, last30Days)
    ]);

    return {
      users: this.calculateTrend(currentPeriod.users, previousPeriod.users),
      bookings: this.calculateTrend(currentPeriod.bookings, previousPeriod.bookings),
      revenue: this.calculateTrend(currentPeriod.revenue, previousPeriod.revenue),
      conversion: this.calculateTrend(currentPeriod.conversion, previousPeriod.conversion)
    };
  }

  async getPeriodStats(startDate, endDate) {
    const [users, bookings, revenue] = await Promise.all([
      User.countDocuments({ createdAt: { $gte: startDate, $lt: endDate } }),
      Booking.countDocuments({ createdAt: { $gte: startDate, $lt: endDate } }),
      Payment.aggregate([
        { 
          $match: { 
            status: 'completed',
            createdAt: { $gte: startDate, $lt: endDate }
          }
        },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ])
    ]);

    return {
      users,
      bookings,
      revenue: revenue[0]?.total || 0,
      conversion: bookings > 0 ? (bookings / users * 100) : 0
    };
  }

  calculateTrend(current, previous) {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous * 100).toFixed(1);
  }

  calculateGrowthRate(monthlyData) {
    if (monthlyData.length < 2) return 0;
    const latest = monthlyData[monthlyData.length - 1];
    const previous = monthlyData[monthlyData.length - 2];
    return this.calculateTrend(latest.revenue, previous.revenue);
  }

  async getTopPerformers() {
    const topPGs = await PG.find({ isApproved: true, isActive: true })
      .sort({ 'rating.overall': -1, bookingCount: -1 })
      .limit(10)
      .select('name location.city rating bookingCount');

    const topOwners = await User.aggregate([
      { $match: { role: 'owner' } },
      {
        $lookup: {
          from: 'pgs',
          localField: '_id',
          foreignField: 'owner',
          as: 'pgs'
        }
      },
      {
        $addFields: {
          totalBookings: { $sum: '$pgs.bookingCount' },
          avgRating: { $avg: '$pgs.rating.overall' },
          totalPGs: { $size: '$pgs' }
        }
      },
      { $sort: { totalBookings: -1 } },
      { $limit: 10 }
    ]);

    return { topPGs, topOwners };
  }
}

module.exports = new AnalyticsService();