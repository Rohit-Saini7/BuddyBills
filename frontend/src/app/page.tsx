'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';

export default function Home() {
  const [apiStatus, setApiStatus] = useState('checking...');
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  useEffect(() => {
    if (!apiBaseUrl) {
      setApiStatus('API URL not configured');
      return;
    }
    fetch(`${apiBaseUrl}/health`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        setApiStatus(`OK (${data.time})`);
      })
      .catch((error) => {
        console.error('Error fetching API status:', error);
        setApiStatus('Error connecting');
      });
  }, [apiBaseUrl]); // Depend on apiBaseUrl

  return (
    <main className='flex min-h-screen flex-col items-center justify-between p-24'>
      <div className='z-10 w-full max-w-5xl items-center justify-between font-mono text-sm lg:flex'>
        <Image alt="BuddyBills' Logo" src="/assets/logo.svg" height={40} width={40} /><h1>Welcome to BuddyBills!</h1>
        <p>Backend API Status: {apiStatus}</p>
      </div>
    </main>
  );
}
