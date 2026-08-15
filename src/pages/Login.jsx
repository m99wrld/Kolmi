// ============================================================================
// XPay — Login por telefone (OTP via SMS)
// ----------------------------------------------------------------------------
// Fluxo em 2 passos: número de telemóvel → código SMS → entra.
// Mantém o visual original do AuthLayout. O login por telefone também
// funciona como registo automático (se o número ainda não tem conta).
// ============================================================================

import React, { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/firebase";
import { createUsuarioIfNeeded } from "@/lib/usuarioDoc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn, Phone, Loader2 } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import AuthLayout from "@/components/AuthLayout";
import { toast } from "@/components/ui/use-toast";
import { safeReturnTo } from "@/lib/authReturnTo";

export default function Login() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [normalizado, setNormalizado] = useState("");
  const returnTo = safeReturnTo();

  const formatNumber = (raw) => (raw || "").replace(/\D/g, "");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const digits = formatNumber(phoneNumber);
    if (digits.length < 9) {
      setError("Insira um número de telemóvel válido (ex.: +258 87 841 53 95)");
      return;
    }
    const normalized = digits.startsWith("258") ? `+${digits}` : `+258${digits}`;
    setLoading(true);
    try {
      await base44.auth.sendOtp(normalized);
      setNormalizado(normalized);
      setShowOtp(true);
    } catch (err) {
      console.error(err);
      setError(err.message || "Não foi possível enviar o código. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setError("");
    setLoading(true);
    try {
      const result = await base44.auth.verifyOtp(otpCode);
      await createUsuarioIfNeeded({ uid: result.id, phoneNumber: result.phoneNumber });
      window.location.href = returnTo;
    } catch (err) {
      console.error(err);
      setError(err.message || "Código inválido. Verifique e tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    setLoading(true);
    try {
      await base44.auth.resendOtp(normalizado);
      toast({
        title: "Código reenviado",
        description: "Verifique as mensagens SMS no seu telemóvel.",
      });
    } catch (err) {
      setError(err.message || "Falha ao reenviar o código");
    } finally {
      setLoading(false);
    }
  };

  if (showOtp) {
    return (
      <AuthLayout
        icon={Phone}
        title="Verifique o seu número"
        subtitle={`Enviámos um código para ${normalizado}`}
      >
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            {error}
          </div>
        )}
        <div className="flex justify-center mb-6">
          <InputOTP
            maxLength={6}
            value={otpCode}
            onChange={setOtpCode}
            autoFocus
            autoComplete="one-time-code"
          >
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>
        </div>
        <Button
          className="w-full h-12 font-medium"
          onClick={handleVerify}
          disabled={loading || otpCode.length < 6}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Entrando...
            </>
          ) : (
            "Entrar"
          )}
        </Button>
        <p className="text-center text-sm text-muted-foreground mt-4">
          Não recebeu o código?{" "}
          <button
            onClick={handleResend}
            className="text-primary font-medium hover:underline"
            disabled={loading}
          >
            Reenviar
          </button>
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      icon={LogIn}
      title="Bem-vindo de volta"
      subtitle="Entre com o seu número de telemóvel"
      footer={
        <>
          Não tem conta?{" "}
          <Link
            to={"/register" + (returnTo !== "/" ? "?returnTo=" + encodeURIComponent(returnTo) : "")}
            className="text-primary font-medium hover:underline"
          >
            Criar conta
          </Link>
        </>
      }
    >
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="phoneNumber">Número de telemóvel</Label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="phoneNumber"
              type="tel"
              autoComplete="tel"
              autoFocus
              placeholder="+258 87 841 53 95"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>
        <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Enviando código...
            </>
          ) : (
            "Enviar código"
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}
