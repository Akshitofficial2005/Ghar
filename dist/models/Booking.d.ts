import mongoose, { Document } from 'mongoose';
export interface IBooking extends Document {
    userId: mongoose.Types.ObjectId;
    pgId: mongoose.Types.ObjectId;
    roomTypeId: string;
    checkIn: Date;
    checkOut: Date;
    guests: number;
    totalAmount: number;
    paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
    paymentId?: string;
    bookingStatus: 'pending' | 'confirmed' | 'cancelled' | 'completed';
    specialRequests?: string;
    cancellationReason?: string;
    cancelledAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}
export declare const Booking: mongoose.Model<IBooking, {}, {}, {}, mongoose.Document<unknown, {}, IBooking, {}> & IBooking & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=Booking.d.ts.map