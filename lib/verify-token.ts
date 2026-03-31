import jwt from "jsonwebtoken";

export interface DecodedToken {
  userId: string;
  rol: "SUPERADMIN" | "ADMIN" | "PROFESIONAL" | "AUXILIAR";
  iat: number;
  exp: number;
}

export function verifyToken(req: Request): { error?: string; decoded?: DecodedToken, status?: number } {
  const authHeader = req.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: 'No se encontró un token Bearer en la autorización.', status: 401 };
  }

  const token = authHeader.split(' ')[1];
  const JWT_SECRET = process.env.JWT_SECRET;

  if (!JWT_SECRET) {
    console.error("CRITICAL: JWT_SECRET is not defined in environment.");
    return { error: 'Configuración interna del servidor inválida.', status: 500 };
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as DecodedToken;
    return { decoded };
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      return { error: 'El token ha expirado. Por favor, inicie sesión nuevamente.', status: 401 };
    }
    return { error: 'Token inválido o corrupto.', status: 403 };
  }
}
