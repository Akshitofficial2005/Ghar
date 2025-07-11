export interface EmailOptions {
    to: string;
    subject: string;
    html: string;
    text?: string;
}
export declare const sendEmail: (options: EmailOptions) => Promise<void>;
export declare const emailTemplates: {
    welcomeEmail: (name: string) => {
        subject: string;
        html: string;
    };
    bookingConfirmation: (name: string, pgName: string, checkIn: string, checkOut: string) => {
        subject: string;
        html: string;
    };
    pgApproval: (ownerName: string, pgName: string) => {
        subject: string;
        html: string;
    };
    pgRejection: (ownerName: string, pgName: string, reason: string) => {
        subject: string;
        html: string;
    };
};
//# sourceMappingURL=email.d.ts.map