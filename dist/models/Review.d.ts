import mongoose, { Document } from 'mongoose';
export interface IReview extends Document {
    userId: mongoose.Types.ObjectId;
    pgId: mongoose.Types.ObjectId;
    rating: number;
    comment: string;
    isVerified: boolean;
    adminResponse?: string;
    adminResponseAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}
export declare const Review: mongoose.Model<IReview, {}, {}, {}, mongoose.Document<unknown, {}, IReview, {}> & IReview & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=Review.d.ts.map