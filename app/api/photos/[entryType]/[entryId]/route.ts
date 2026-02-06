import { NextRequest, NextResponse } from 'next/server';
import { getSession, getApiKeyUser } from '@/lib/auth';
import { savePhoto, getPhoto, deletePhoto, isValidEntryType } from '@/lib/photos';
import type { PhotoEntryType } from '@/lib/photos';

const MAX_PHOTO_SIZE = 5 * 1024 * 1024; // 5MB

type RouteContext = {
  params: Promise<{ entryType: string; entryId: string }>;
};

// GET /api/photos/[entryType]/[entryId] -- Serve photo
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const session = await getSession();
    const user = session || await getApiKeyUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { entryType, entryId } = await context.params;
    if (!isValidEntryType(entryType)) {
      return NextResponse.json({ success: false, error: 'Invalid entry type' }, { status: 400 });
    }

    const photo = await getPhoto(user.username, entryType as PhotoEntryType, entryId);
    if (!photo) {
      return NextResponse.json({ success: false, error: 'Photo not found' }, { status: 404 });
    }

    return new NextResponse(new Uint8Array(photo), {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to get photo' },
      { status: 500 }
    );
  }
}

// POST /api/photos/[entryType]/[entryId] -- Upload photo
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const session = await getSession();
    const user = session || await getApiKeyUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { entryType, entryId } = await context.params;
    if (!isValidEntryType(entryType)) {
      return NextResponse.json({ success: false, error: 'Invalid entry type' }, { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get('photo') as File | null;
    if (!file) {
      return NextResponse.json({ success: false, error: 'No photo provided' }, { status: 400 });
    }

    if (file.size > MAX_PHOTO_SIZE) {
      return NextResponse.json({ success: false, error: 'Photo too large (max 5MB)' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const url = await savePhoto(user.username, entryType as PhotoEntryType, entryId, buffer);

    return NextResponse.json({ success: true, data: { url } });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to upload photo' },
      { status: 500 }
    );
  }
}

// DELETE /api/photos/[entryType]/[entryId] -- Delete photo
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const session = await getSession();
    const user = session || await getApiKeyUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { entryType, entryId } = await context.params;
    if (!isValidEntryType(entryType)) {
      return NextResponse.json({ success: false, error: 'Invalid entry type' }, { status: 400 });
    }

    await deletePhoto(user.username, entryType as PhotoEntryType, entryId);
    return NextResponse.json({ success: true, data: { deleted: true } });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to delete photo' },
      { status: 500 }
    );
  }
}
