import React from 'react';
import { useOutletContext } from 'react-router-dom';
import ClienteHome from '@/components/ClienteHome';
import PrestadorHome from '@/components/PrestadorHome';

export default function Home() {
  const { usuario, prestador, reload } = useOutletContext();

  if (usuario.tipo === 'cliente') return <ClienteHome usuario={usuario} />;
  return <PrestadorHome usuario={usuario} prestador={prestador} reload={reload} />;
}