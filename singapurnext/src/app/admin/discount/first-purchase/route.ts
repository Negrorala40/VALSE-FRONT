import { NextRequest, NextResponse } from 'next/server';

// Simulación - En producción, esto llamaría a tu backend Java
let mockConfig = {
  enabled: true,
  discountPercentage: 10,
  applyToAnonymous: true
};

export async function GET() {
  return NextResponse.json(mockConfig);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    mockConfig = { ...mockConfig, ...body };
    return NextResponse.json(mockConfig);
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al procesar la solicitud' },
      { status: 500 }
    );
  }
}