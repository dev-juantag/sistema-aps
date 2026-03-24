import nodemailer from "nodemailer";

/*
  CAMBIAR O ADMINISTRAR CORREO DE GESTION DE ENVIO DE EMAILS PARA RECUPERAR LA CONTRASEÑA:
  Puedes cambiar estos valores creando un archivo .env en la raíz del proyecto.
  Por ejemplo, para usar un correo de Gmail deberás usar una contraseña de aplicación de Google.
*/
const SMTP_HOST = process.env.SMTP_HOST || "smtp.gmail.com";
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "587");
const SMTP_USER = process.env.SMTP_USER || ""; 
const SMTP_PASS = process.env.SMTP_PASS || "";

import { COMPANY_NAME } from "./constants";

// cambiar nombre de la empresa
const APP_NAME = COMPANY_NAME;

export const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_PORT === 465, // true for 465, false for other ports
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
});

export const sendRecoveryEmail = async (to: string, code: string, primerNombre: string, isAdminRequest: boolean = false) => {
  if (!SMTP_USER || !SMTP_PASS) {
    console.warn("⚠️ Nodemailer no está configurado. El código generado es:", code);
    // Solo simularemos el envío si las credenciales no están enviadas, útil para pruebas locales
    return true; 
  }

  try {
    await transporter.sendMail({
      from: `"Sistema Gestión de Atenciones - ${APP_NAME}" <${SMTP_USER}>`,
      to,
      subject: `Código de Verificación - ${APP_NAME}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
          <div style="background-color: #081e69; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">${APP_NAME}</h1>
          </div>
          <div style="padding: 30px; background-color: #ffffff;">
            <p style="font-size: 16px; color: #334155;">Hola, ${primerNombre}</p>
            <p style="font-size: 16px; color: #334155;">
              ${
                isAdminRequest 
                  ? "Un administrador ha solicitado restablecer tu contraseña para acceder al sistema." 
                  : "Has solicitado restablecer tu contraseña para acceder al <strong>Sistema de control interno</strong>."
              }
            </p>
            
            <p style="font-size: 16px; color: #334155;">Usa el siguiente código de verificación para continuar:</p>

            <div style="background-color: #f8fafc; border-left: 4px solid #081e69; padding: 15px; margin: 25px 0;">
              <p style="margin: 0; font-size: 14px; color: #64748b; text-align: center;">TU CÓDIGO:</p>
              <p style="margin: 10px 0 0 0; font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #081e69; text-align: center;">${code}</p>
            </div>
            
            <p style="font-size: 14px; color: #64748b; margin-top: 30px;">
              <strong>Importante:</strong> Este código tiene una validez de 10 minutos. No lo compartas con nadie.
            </p>
            
            <p style="font-size: 14px; color: #94a3b8; margin-top: 20px;">
              Si no solicitaste este cambio, por favor contacta al administrador del sistema.
            </p>
          </div>
        </div>
      `,
    });
    return true;
  } catch (error) {
    console.error("Error enviando email:", error);
    return false;
  }
};
