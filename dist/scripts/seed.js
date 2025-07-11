"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const dotenv_1 = __importDefault(require("dotenv"));
const User_1 = require("../models/User");
const PG_1 = require("../models/PG");
const Review_1 = require("../models/Review");
dotenv_1.default.config();
const connectDB = async () => {
    try {
        await mongoose_1.default.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pg-booking');
        console.log('MongoDB connected for seeding');
    }
    catch (error) {
        console.error('Database connection error:', error);
        process.exit(1);
    }
};
const seedData = async () => {
    try {
        await User_1.User.deleteMany({});
        await PG_1.PG.deleteMany({});
        await Review_1.Review.deleteMany({});
        console.log('Cleared existing data');
        const adminPassword = await bcryptjs_1.default.hash('admin123', 12);
        const admin = await User_1.User.create({
            name: 'Admin User',
            email: 'admin@pgbooking.com',
            password: adminPassword,
            phone: '+919999999999',
            role: 'admin',
            isVerified: true,
        });
        const ownerPassword = await bcryptjs_1.default.hash('owner123', 12);
        const owner1 = await User_1.User.create({
            name: 'Rajesh Kumar',
            email: 'rajesh@example.com',
            password: ownerPassword,
            phone: '+919876543210',
            role: 'owner',
            isVerified: true,
        });
        const owner2 = await User_1.User.create({
            name: 'Priya Sharma',
            email: 'priya@example.com',
            password: ownerPassword,
            phone: '+919876543211',
            role: 'owner',
            isVerified: true,
        });
        const owner3 = await User_1.User.create({
            name: 'Amit Patel',
            email: 'amit@example.com',
            password: ownerPassword,
            phone: '+919876543212',
            role: 'owner',
            isVerified: true,
        });
        const userPassword = await bcryptjs_1.default.hash('user123', 12);
        const user1 = await User_1.User.create({
            name: 'Arjun Singh',
            email: 'arjun@example.com',
            password: userPassword,
            phone: '+919876543213',
            role: 'user',
            isVerified: true,
        });
        const user2 = await User_1.User.create({
            name: 'Sneha Gupta',
            email: 'sneha@example.com',
            password: userPassword,
            phone: '+919876543214',
            role: 'user',
            isVerified: true,
        });
        console.log('Created users');
        const pg1 = await PG_1.PG.create({
            name: 'Sunrise PG for Boys',
            description: 'A comfortable and affordable PG accommodation for working professionals and students. Located in the heart of the city with excellent connectivity to major IT hubs and educational institutions.',
            images: [
                'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800&h=600&fit=crop',
                'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&h=600&fit=crop',
                'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop',
            ],
            location: {
                address: '123 MG Road, Near Metro Station',
                city: 'Bangalore',
                state: 'Karnataka',
                pincode: '560001',
                coordinates: {
                    lat: 12.9716,
                    lng: 77.5946,
                },
            },
            amenities: {
                wifi: true,
                food: true,
                laundry: true,
                parking: true,
                gym: false,
                ac: true,
                powerBackup: true,
                security: true,
            },
            roomTypes: [
                {
                    type: 'single',
                    price: 12000,
                    deposit: 24000,
                    availableRooms: 3,
                    totalRooms: 5,
                    amenities: ['AC', 'Attached Bathroom', 'Study Table', 'Wardrobe'],
                    images: ['https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&h=600&fit=crop'],
                },
                {
                    type: 'double',
                    price: 8000,
                    deposit: 16000,
                    availableRooms: 2,
                    totalRooms: 8,
                    amenities: ['AC', 'Attached Bathroom', 'Study Table', 'Wardrobe'],
                    images: ['https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop'],
                },
            ],
            rules: [
                'No smoking or drinking allowed',
                'Visitors allowed till 9 PM',
                'Maintain cleanliness',
                'No loud music after 10 PM',
            ],
            ownerId: owner1._id,
            ownerName: owner1.name,
            ownerPhone: owner1.phone,
            rating: 4.5,
            reviewCount: 23,
            isApproved: true,
        });
        const pg2 = await PG_1.PG.create({
            name: 'Green Valley Girls Hostel',
            description: 'Safe and secure accommodation for girls with 24/7 security, CCTV surveillance, and homely food. Perfect for working women and students.',
            images: [
                'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&h=600&fit=crop',
                'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&h=600&fit=crop',
                'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=800&h=600&fit=crop',
            ],
            location: {
                address: '456 Brigade Road, Commercial Street',
                city: 'Bangalore',
                state: 'Karnataka',
                pincode: '560025',
                coordinates: {
                    lat: 12.9698,
                    lng: 77.6205,
                },
            },
            amenities: {
                wifi: true,
                food: true,
                laundry: true,
                parking: false,
                gym: true,
                ac: true,
                powerBackup: true,
                security: true,
            },
            roomTypes: [
                {
                    type: 'single',
                    price: 15000,
                    deposit: 30000,
                    availableRooms: 1,
                    totalRooms: 3,
                    amenities: ['AC', 'Attached Bathroom', 'Study Table', 'Wardrobe', 'Balcony'],
                    images: ['https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&h=600&fit=crop'],
                },
                {
                    type: 'double',
                    price: 10000,
                    deposit: 20000,
                    availableRooms: 4,
                    totalRooms: 6,
                    amenities: ['AC', 'Attached Bathroom', 'Study Table', 'Wardrobe'],
                    images: ['https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=800&h=600&fit=crop'],
                },
            ],
            rules: [
                'Only for girls',
                'No male visitors allowed',
                'Curfew at 10 PM',
                'No smoking or drinking',
                'Maintain discipline',
            ],
            ownerId: owner2._id,
            ownerName: owner2.name,
            ownerPhone: owner2.phone,
            rating: 4.8,
            reviewCount: 45,
            isApproved: true,
        });
        const pg3 = await PG_1.PG.create({
            name: 'Tech Hub Co-living',
            description: 'Modern co-living space designed for tech professionals with high-speed internet, gaming zone, and collaborative spaces. Premium amenities included.',
            images: [
                'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&h=600&fit=crop',
                'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800&h=600&fit=crop',
                'https://images.unsplash.com/photo-1571624436279-b272aff752b5?w=800&h=600&fit=crop',
            ],
            location: {
                address: '789 Electronic City Phase 1',
                city: 'Bangalore',
                state: 'Karnataka',
                pincode: '560100',
                coordinates: {
                    lat: 12.8456,
                    lng: 77.6603,
                },
            },
            amenities: {
                wifi: true,
                food: true,
                laundry: true,
                parking: true,
                gym: true,
                ac: true,
                powerBackup: true,
                security: true,
            },
            roomTypes: [
                {
                    type: 'single',
                    price: 18000,
                    deposit: 36000,
                    availableRooms: 2,
                    totalRooms: 4,
                    amenities: ['AC', 'Attached Bathroom', 'Work Desk', 'Wardrobe', 'Mini Fridge'],
                    images: ['https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800&h=600&fit=crop'],
                },
                {
                    type: 'double',
                    price: 12000,
                    deposit: 24000,
                    availableRooms: 3,
                    totalRooms: 6,
                    amenities: ['AC', 'Attached Bathroom', 'Work Desk', 'Wardrobe'],
                    images: ['https://images.unsplash.com/photo-1571624436279-b272aff752b5?w=800&h=600&fit=crop'],
                },
            ],
            rules: [
                'Professional environment',
                'No loud music in common areas',
                'Clean up after yourself',
                'Respect others privacy',
            ],
            ownerId: owner3._id,
            ownerName: owner3.name,
            ownerPhone: owner3.phone,
            rating: 4.7,
            reviewCount: 67,
            isApproved: true,
        });
        await PG_1.PG.create({
            name: 'Modern Living Spaces',
            description: 'Brand new PG facility with all modern amenities.',
            images: [
                'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&h=600&fit=crop',
            ],
            location: {
                address: '101 Whitefield Main Road',
                city: 'Bangalore',
                state: 'Karnataka',
                pincode: '560066',
                coordinates: {
                    lat: 12.9698,
                    lng: 77.7499,
                },
            },
            amenities: {
                wifi: true,
                food: true,
                laundry: true,
                parking: true,
                gym: false,
                ac: true,
                powerBackup: true,
                security: true,
            },
            roomTypes: [
                {
                    type: 'single',
                    price: 14000,
                    deposit: 28000,
                    availableRooms: 5,
                    totalRooms: 5,
                    amenities: ['AC', 'Attached Bathroom', 'Study Table', 'Wardrobe'],
                    images: ['https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&h=600&fit=crop'],
                },
            ],
            rules: [
                'No smoking',
                'Visitors allowed till 8 PM',
                'Maintain cleanliness',
            ],
            ownerId: owner1._id,
            ownerName: owner1.name,
            ownerPhone: owner1.phone,
            rating: 0,
            reviewCount: 0,
            isApproved: false,
        });
        console.log('Created PGs');
        await Review_1.Review.create({
            userId: user1._id,
            pgId: pg1._id,
            rating: 5,
            comment: 'Excellent PG with great facilities. The food is homely and the staff is very cooperative. Highly recommended for working professionals.',
        });
        await Review_1.Review.create({
            userId: user2._id,
            pgId: pg1._id,
            rating: 4,
            comment: 'Good location and amenities. WiFi speed could be better but overall a nice place to stay.',
        });
        await Review_1.Review.create({
            userId: user1._id,
            pgId: pg2._id,
            rating: 5,
            comment: 'Very safe and clean environment. Perfect for working women. The security is top-notch.',
        });
        await Review_1.Review.create({
            userId: user2._id,
            pgId: pg3._id,
            rating: 5,
            comment: 'Amazing co-living space! Great for networking with other professionals. The gaming zone is a nice touch.',
        });
        console.log('Created reviews');
        console.log('Database seeded successfully!');
        console.log('--------------------');
        console.log('Login Credentials:');
        console.log('Admin: admin@pgbooking.com / admin123');
        console.log('Owner: rajesh@example.com / owner123');
        console.log('User: arjun@example.com / user123');
        console.log('--------------------');
        process.exit(0);
    }
    catch (error) {
        console.error('Error seeding database:', error);
        process.exit(1);
    }
};
const runSeed = async () => {
    await connectDB();
    await seedData();
};
runSeed();
//# sourceMappingURL=seed.js.map