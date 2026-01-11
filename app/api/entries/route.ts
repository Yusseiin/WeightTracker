import { NextRequest, NextResponse } from 'next/server';
import { getEntries, addEntry } from '@/lib/data';
import { getSession, getApiKeyUser } from '@/lib/auth';
import { ApiResponse, WeightEntry } from '@/lib/types';

// GET /api/entries - List all entries
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    const user = session || await getApiKeyUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const entries = await getEntries(user.username);

    const response: ApiResponse<WeightEntry[]> = {
      success: true,
      data: entries
    };

    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch entries';
    const status = message.includes('not found') ? 404 : 500;
    const response: ApiResponse<null> = {
      success: false,
      error: message
    };
    return NextResponse.json(response, { status });
  }
}

// POST /api/entries - Create new entry
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    const user = session || await getApiKeyUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { weight, training, sleep, timestamp } = body;

    // Validate required fields
    if (typeof weight !== 'number' || weight <= 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid weight value' },
        { status: 400 }
      );
    }

    if (typeof training !== 'string' || training.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'Invalid training value' },
        { status: 400 }
      );
    }

    if (![0, 1, 2].includes(sleep)) {
      return NextResponse.json(
        { success: false, error: 'Invalid sleep value' },
        { status: 400 }
      );
    }

    const entry = await addEntry(
      {
        author: user.username,
        weight,
        training,
        sleep,
        timestamp: timestamp || new Date().toISOString()
      },
      user.username
    );

    const response: ApiResponse<WeightEntry> = {
      success: true,
      data: entry
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create entry';
    const status = message.includes('not found') ? 404 : 500;
    const response: ApiResponse<null> = {
      success: false,
      error: message
    };
    return NextResponse.json(response, { status });
  }
}
