import React from 'react';
// Simple SVG user icon for profile avatar
export default function UserIcon({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" />
      <path stroke="currentColor" strokeWidth="2" d="M4 20c0-4 4-6 8-6s8 2 8 6" />
    </svg>
  );
}
