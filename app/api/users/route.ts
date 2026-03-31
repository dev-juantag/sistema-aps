export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { capitalizeWords } from "@/lib/utils";
import { verifyToken } from "@/lib/verify-token";

// ──────────── GET ────────────

export async function GET(req: Request) {
  try {
    const auth = verifyToken(req);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    // Only allow admins to list users (or superadmins)
    if (auth.decoded?.rol !== "SUPERADMIN" && auth.decoded?.rol !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado para listar usuarios." }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        nombre: true,
        apellidos: true,
        documento: true,
        email: true,
        rol: true,
        activo: true,
        programaId: true,
        territorioId: true,
        telefono: true,
        createdAt: true,
        lastLogin: true,
        programa: {
          select: {
            nombre: true
          }
        },
        // Eliminado password, recoveryCode y recoveryExpires por seguridad
      }
    });

    const formattedUsers = users.map((u) => ({
      ...u,
      rol: u.rol.toLowerCase(),
    }));

    return NextResponse.json(formattedUsers);
  } catch (error) {
    return NextResponse.json(
      { error: "Error al obtener usuarios" },
      { status: 500 },
    );
  }
}

// ──────────── POST ────────────

export async function POST(req: Request) {
  try {
    const auth = verifyToken(req);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    // Only allow admins to create users
    if (auth.decoded?.rol !== "SUPERADMIN" && auth.decoded?.rol !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado para crear usuarios." }, { status: 403 });
    }

    const body = await req.json();

    let { nombre, apellidos, documento, email, telefono, password, rol, programaId, territorioId } =
      body;

    nombre = capitalizeWords(nombre);
    apellidos = capitalizeWords(apellidos);

    const upperRol = typeof rol === 'string' ? rol.toUpperCase() : "AUXILIAR";
    const validRolesWithPrograma = ["PROFESIONAL"];
    const validRolesWithTerritorio = ["AUXILIAR", "PROFESIONAL"];

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { documento }],
      },
      select: { id: true, activo: true, rol: true } // Solo lo necesario
    });

    if (existingUser) {
      if (!(existingUser as any).activo) {
        const updatedUser = await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            activo: true,
            nombre,
            apellidos,
            rol: upperRol as any,
            telefono: telefono || null,
            programaId: validRolesWithPrograma.includes(upperRol) ? programaId || null : null,
            territorioId: validRolesWithTerritorio.includes(upperRol) ? territorioId || null : null,
            lastLogin: new Date(),
          } as any,
          select: { id: true, nombre: true, apellidos: true, rol: true, email: true }
        });
        return NextResponse.json({
          ...updatedUser,
          rol: updatedUser.rol.toLowerCase(),
        });
      }
      return NextResponse.json(
        { error: "Ya existe un usuario con este documento o correo." },
        { status: 400 },
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        nombre,
        apellidos,
        documento,
        email,
        telefono: telefono || null,
        password: hashedPassword,
        rol: upperRol as any,
        programaId: validRolesWithPrograma.includes(upperRol) ? programaId || null : null,
        territorioId: validRolesWithTerritorio.includes(upperRol) ? territorioId || null : null,
      },
      select: { id: true, nombre: true, apellidos: true, rol: true, email: true } // No deovolver password
    });

    return NextResponse.json({
      ...newUser,
      rol: newUser.rol.toLowerCase(),
    });
  } catch (error: any) {
    console.error("DEBUG CREAR USUARIO", error);
    return NextResponse.json(
      {
        error: "Error al crear usuario",
        details: error?.message,
        stack: error?.stack,
      },
      { status: 500 },
    );
  }
}
