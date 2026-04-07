import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";

export interface DecodedToken {
  userId: string;
  rol: "SUPERADMIN" | "ADMIN" | "PROFESIONAL" | "AUXILIAR" | "FACTURADOR" | "ADMINISTRATIVO" | "ABOGADO";
  iat: number;
  exp: number;
}

export async function verifyToken(req: Request): Promise<{ error?: string; decoded?: DecodedToken, status?: number }> {
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
    
    // Verificamos si hay un login más reciente usando lastLogin
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { lastLogin: true, activo: true }
    });

    if (!user || user.activo === false) {
      return { error: 'Usuario no existe o está desactivado.', status: 401 };
    }

    if (user.lastLogin && decoded.iat) {
      const iatTime = decoded.iat;
      // Validamos dándole 5 segundos de margen
      const lastLoginTime = Math.floor(user.lastLogin.getTime() / 1000) - 5;
      
      if (iatTime < lastLoginTime) {
        return { error: 'Sesión terminada: Alguien inició sesión en otra ubicación.', status: 401 };
      }
    }

    return { decoded };
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      return { error: 'El token ha expirado. Por favor, inicie sesión nuevamente.', status: 401 };
    }
    return { error: 'Token inválido o corrupto.', status: 403 };
  }
}
