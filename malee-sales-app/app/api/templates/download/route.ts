import { NextResponse } from 'next/server';

/**
 * Download all templates as individual files
 * Files are served from public/templates/ directory
 */
export async function GET() {
    try {
        const templates = [
            { name: 'sales_history_template.csv', required: true },
            { name: 'product_master_template.csv', required: true },
            { name: 'calendar_template.csv', required: true },
            { name: 'promotions_template.csv', required: false },
            { name: 'inventory_template.csv', required: false },
        ];

        const downloadUrls = templates.map(t => ({
            filename: t.filename || t.name,
            url: `/templates/${t.name}`,
            required: t.required,
        }));

        return NextResponse.json(downloadUrls);
    } catch (error) {
        console.error('Error listing templates:', error);
        return NextResponse.json(
            { error: 'Failed to list templates' },
            { status: 500 }
        );
    }
}
