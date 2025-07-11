import mongoose, { Document } from 'mongoose';
export interface IRoomType {
    _id?: mongoose.Types.ObjectId;
    type: 'single' | 'double' | 'triple' | 'dormitory';
    price: number;
    deposit: number;
    availableRooms: number;
    totalRooms: number;
    amenities: string[];
    images: string[];
}
export interface IPG extends Document {
    name: string;
    description: string;
    images: string[];
    location: {
        address: string;
        city: string;
        state: string;
        pincode: string;
        coordinates: {
            lat: number;
            lng: number;
        };
    };
    amenities: {
        wifi: boolean;
        food: boolean;
        laundry: boolean;
        parking: boolean;
        gym: boolean;
        ac: boolean;
        powerBackup: boolean;
        security: boolean;
    };
    roomTypes: IRoomType[];
    rules: string[];
    ownerId: mongoose.Types.ObjectId;
    ownerName: string;
    ownerPhone: string;
    rating: number;
    reviewCount: number;
    isApproved: boolean;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export declare const PG: mongoose.Model<IPG, {}, {}, {}, mongoose.Document<unknown, {}, IPG, {}> & IPG & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=PG.d.ts.map