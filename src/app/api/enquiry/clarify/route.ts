import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
    try {
        const { email, customerName, notes, companyName } = await request.json();

        if (!email || !notes) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Fetch custom SMTP settings from database
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL || '',
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
        );

        const { data: settings } = await supabase
            .from('platform_settings')
            .select('smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from')
            .eq('id', 'global')
            .single();

        const host = settings?.smtp_host || process.env.SMTP_HOST || '';
        const port = settings?.smtp_port || parseInt(process.env.SMTP_PORT || '587');
        const user = settings?.smtp_user || process.env.SMTP_USER || '';
        const pass = settings?.smtp_pass || process.env.SMTP_PASS || '';
        const from = settings?.smtp_from || process.env.SMTP_FROM || '"ScheduleLab No-Reply" <noreply@schedulelab.com>';

        if (!host || !user || !pass) {
            console.warn("SMTP settings are incomplete. The email will likely fail.");
        }

        // Configure generic SMTP transport
        const transporter = nodemailer.createTransport({
            host,
            port,
            auth: {
                user,
                pass,
            },
        });

        const mailOptions = {
            from,
            to: email,
            subject: `Clarification Required: Your Enquiry with ${companyName || 'Us'}`,
            text: `Hi ${customerName},\n\nWe are reviewing your recent enquiry and need a bit more information before we can proceed.\n\nOur team noted the following:\n${notes}\n\nPlease reply to this email or contact us to clarify, so we can get your job booked in.\n\nThanks,\n${companyName || 'The Team'}`,
        };

        await transporter.sendMail(mailOptions);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error sending clarification email:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
