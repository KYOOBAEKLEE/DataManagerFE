import { NextRequest, NextResponse } from 'next/server';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export async function POST(request: NextRequest) {
    try {
        const { messages, context } = await request.json();

        const systemMessage = {
            role: 'system',
            content: `You are a helpful assistant for a Data Management application. 
You help users understand API responses and data structures.
When users reference JSON data, analyze it and provide insights.
Always respond in markdown format for better readability.
${context ? `\n\nUser is currently referencing this data:\n\`\`\`json\n${JSON.stringify(context, null, 2)}\n\`\`\`` : ''}`
        };

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
                model: 'gpt-4.1',
                messages: [systemMessage, ...messages],
                temperature: 0.7,
                max_tokens: 4096,
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            return NextResponse.json(
                { error: error.error?.message || 'OpenAI API error' },
                { status: response.status }
            );
        }

        const data = await response.json();
        const assistantMessage = data.choices[0]?.message?.content || '';

        return NextResponse.json({ content: assistantMessage });
    } catch (error) {
        console.error('Chat API error:', error);
        return NextResponse.json(
            { error: 'Failed to process chat request' },
            { status: 500 }
        );
    }
}
