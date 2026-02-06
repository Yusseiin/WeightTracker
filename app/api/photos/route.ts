import { NextRequest, NextResponse } from 'next/server';
import { getSession, getApiKeyUser } from '@/lib/auth';
import { listPhotosForType, isValidEntryType } from '@/lib/photos';
import type { PhotoEntryType } from '@/lib/photos';

// GET /api/photos?type={entryType} -- List entry IDs that have photos
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    const user = session || await getApiKeyUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const entryType = searchParams.get('type');

    if (!entryType || !isValidEntryType(entryType)) {
      return NextResponse.json({ success: false, error: 'Invalid or missing entry type' }, { status: 400 });
    }

    const ids = await listPhotosForType(user.username, entryType as PhotoEntryType);
    return NextResponse.json({ success: true, data: ids });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to list photos' },
      { status: 500 }
    );
  }
}
