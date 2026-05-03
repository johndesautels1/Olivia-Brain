"use client";

import { useState } from "react";

interface OliviaConsentModalProps {
  isOpen: boolean;
  onConsent: (granted: boolean) => void;
  onClose: () => void;
}

export function OliviaConsentModal({ isOpen, onConsent, onClose }: OliviaConsentModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedConsents, setSelectedConsents] = useState({
    data_storage: true,
    ai_processing: true,
    learning: false, // Opt-in for learning/personalization
  });

  if (!isOpen) return null;

  const handleGrantConsent = async () => {
    setIsSubmitting(true);
    try {
      const consentTypes = Object.entries(selectedConsents)
        .filter(([, granted]) => granted)
        .map(([type]) => type);

      if (consentTypes.length === 0) {
        // User didn't select any - treat as decline
        onConsent(false);
        return;
      }

      const res = await fetch("/api/olivia/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consentTypes }),
      });

      if (res.ok) {
        onConsent(true);
      } else {
        console.error("Failed to save consent");
        onConsent(false);
      }
    } catch (err) {
      console.error("Consent error:", err);
      onConsent(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDecline = () => {
    onConsent(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md mx-4 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg shadow-xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--card-border)]">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">
            Olivia Needs Your Consent
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            To provide the best experience, Olivia needs permission to store data.
          </p>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-4">
          {/* Data Storage */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={selectedConsents.data_storage}
              onChange={(e) =>
                setSelectedConsents((prev) => ({
                  ...prev,
                  data_storage: e.target.checked,
                }))
              }
              className="mt-1 w-4 h-4 rounded border-[var(--card-border)] bg-[var(--background)] text-brand-600 focus:ring-brand-500"
            />
            <div>
              <span className="text-sm font-medium text-[var(--foreground)]">
                Conversation Storage
              </span>
              <span className="ml-2 text-xs text-brand-400">(Required)</span>
              <p className="text-xs text-[var(--muted)] mt-0.5">
                Store your conversations with Olivia so she can remember context within a session.
              </p>
            </div>
          </label>

          {/* AI Processing */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={selectedConsents.ai_processing}
              onChange={(e) =>
                setSelectedConsents((prev) => ({
                  ...prev,
                  ai_processing: e.target.checked,
                }))
              }
              className="mt-1 w-4 h-4 rounded border-[var(--card-border)] bg-[var(--background)] text-brand-600 focus:ring-brand-500"
            />
            <div>
              <span className="text-sm font-medium text-[var(--foreground)]">
                AI Processing
              </span>
              <span className="ml-2 text-xs text-brand-400">(Required)</span>
              <p className="text-xs text-[var(--muted)] mt-0.5">
                Allow AI models to process your messages to provide intelligent responses.
              </p>
            </div>
          </label>

          {/* Learning (Optional) */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={selectedConsents.learning}
              onChange={(e) =>
                setSelectedConsents((prev) => ({
                  ...prev,
                  learning: e.target.checked,
                }))
              }
              className="mt-1 w-4 h-4 rounded border-[var(--card-border)] bg-[var(--background)] text-brand-600 focus:ring-brand-500"
            />
            <div>
              <span className="text-sm font-medium text-[var(--foreground)]">
                Personalization
              </span>
              <span className="ml-2 text-xs text-[var(--muted)]">(Optional)</span>
              <p className="text-xs text-[var(--muted)] mt-0.5">
                Allow Olivia to learn your preferences over time for better recommendations.
              </p>
            </div>
          </label>

          {/* Privacy Notice */}
          <div className="mt-4 p-3 rounded-md bg-[var(--background)] border border-[var(--card-border)]">
            <p className="text-xs text-[var(--muted)]">
              <strong className="text-[var(--foreground)]">Your rights:</strong> You can view, export, or delete your data anytime from your profile settings.
              Revoking consent will delete all stored conversations. We comply with GDPR and UK data protection laws.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[var(--card-border)] flex justify-end gap-3">
          <button
            onClick={handleDecline}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
          >
            Decline
          </button>
          <button
            onClick={handleGrantConsent}
            disabled={isSubmitting || !selectedConsents.data_storage || !selectedConsents.ai_processing}
            className="px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-md hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? "Saving..." : "I Agree"}
          </button>
        </div>
      </div>
    </div>
  );
}
