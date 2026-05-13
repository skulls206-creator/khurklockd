"use client";

import { useState, type FormEvent } from "react";
import { useVault } from "@/hooks/useVault";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import type { EmergencyContact, DeadManSwitchConfig } from "@/types";

export default function EmergencyPage() {
  const { settings, updateSettings, saveVault } = useVault();

  const contacts: EmergencyContact[] = settings?.emergencyContacts ?? [];
  const deadManSwitch: DeadManSwitchConfig | null =
    settings?.deadManSwitch ?? null;

  const [showAddContact, setShowAddContact] = useState(false);
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactWaitDays, setContactWaitDays] = useState(7);

  // Dead Man's Switch form
  const [dmsInactivityDays, setDmsInactivityDays] = useState(
    deadManSwitch?.inactivityDays ?? 30,
  );
  const [dmsAction, setDmsAction] = useState<"notify" | "share" | "both">(
    deadManSwitch?.action ?? "notify",
  );

  const handleAddContact = async (e: FormEvent) => {
    e.preventDefault();
    if (!contactName.trim() || !contactEmail.trim()) return;

    const newContact: EmergencyContact = {
      id: crypto.randomUUID(),
      name: contactName.trim(),
      email: contactEmail.trim(),
      waitTimeDays: contactWaitDays,
      status: "active",
      createdAt: new Date().toISOString(),
    };

    updateSettings({
      emergencyContacts: [...contacts, newContact],
    });
    await saveVault();

    setContactName("");
    setContactEmail("");
    setContactWaitDays(7);
    setShowAddContact(false);
  };

  const handleRemoveContact = async (id: string) => {
    updateSettings({
      emergencyContacts: contacts.filter((c) => c.id !== id),
    });
    await saveVault();
  };

  const handleArmDms = async () => {
    const config: DeadManSwitchConfig = {
      inactivityDays: dmsInactivityDays,
      lastActivityAt: new Date().toISOString(),
      action: dmsAction,
      armed: true,
    };
    updateSettings({ deadManSwitch: config });
    await saveVault();
  };

  const handleDisarmDms = async () => {
    if (deadManSwitch) {
      updateSettings({
        deadManSwitch: { ...deadManSwitch, armed: false },
      });
      await saveVault();
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">
          Emergency Access
        </h1>
        <p className="text-sm text-text-muted mt-1">
          Give trusted contacts access to your vault in an emergency.
        </p>
      </div>

      {/* Trusted Contacts */}
      <Card
        header={
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-text-primary">
              Trusted Contacts
            </h3>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowAddContact(true)}
            >
              Add Contact
            </Button>
          </div>
        }
      >
        {contacts.length === 0 ? (
          <EmptyState
            title="No emergency contacts"
            description="Add trusted people who can request access to your vault."
            icon={
              <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
            }
          />
        ) : (
          <div className="space-y-2">
            {contacts.map((contact) => (
              <div
                key={contact.id}
                className="flex items-center justify-between p-3 rounded-lg bg-bg-primary"
              >
                <div>
                  <p className="text-sm font-medium text-text-primary">
                    {contact.name}
                  </p>
                  <p className="text-xs text-text-muted">{contact.email}</p>
                  <p className="text-xs text-text-muted mt-1">
                    Wait: {contact.waitTimeDays} day
                    {contact.waitTimeDays !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      contact.status === "active"
                        ? "success"
                        : contact.status === "pending"
                          ? "warning"
                          : "danger"
                    }
                  >
                    {contact.status}
                  </Badge>
                  <button
                    onClick={() => handleRemoveContact(contact.id)}
                    aria-label={`Remove ${contact.name}`}
                    className="text-text-muted hover:text-danger transition-colors p-1 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Dead Man's Switch */}
      <Card header="Dead Man's Switch">
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            If you do not access your vault for the specified number of days,
            your emergency contacts will be notified or given access.
          </p>

          {deadManSwitch?.armed ? (
            <div>
              <div className="p-3 rounded-lg bg-success-muted border border-success/20 mb-3">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="success">Armed</Badge>
                  <span className="text-xs text-text-secondary">
                    Last activity:{" "}
                    {new Date(deadManSwitch.lastActivityAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-text-primary">
                  {deadManSwitch.inactivityDays} days of inactivity will
                  trigger:{" "}
                  <span className="text-accent font-medium">
                    {deadManSwitch.action}
                  </span>
                </p>
              </div>
              <Button variant="danger" onClick={handleDisarmDms}>
                Disarm Switch
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-1">
                <label className="text-sm text-text-secondary">
                  Days of Inactivity Before Trigger
                </label>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={dmsInactivityDays}
                  onChange={(e) =>
                    setDmsInactivityDays(Number(e.target.value))
                  }
                  className="w-24 rounded-md border border-border px-3 py-2 text-sm bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-border-focus focus:border-transparent"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm text-text-secondary">
                  Action on Trigger
                </label>
                <div className="flex gap-4">
                  {(
                    ["notify", "share", "both"] as Array<
                      "notify" | "share" | "both"
                    >
                  ).map((action) => (
                    <label
                      key={action}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <input
                        type="radio"
                        checked={dmsAction === action}
                        onChange={() => setDmsAction(action)}
                        className="text-accent focus:ring-border-focus"
                      />
                      <span className="text-sm text-text-secondary capitalize">
                        {action}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <Button onClick={handleArmDms}>
                Arm Dead Man's Switch
              </Button>
            </>
          )}
        </div>
      </Card>

      {/* Add Contact Modal */}
      <Modal
        open={showAddContact}
        onClose={() => setShowAddContact(false)}
        title="Add Emergency Contact"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setShowAddContact(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleAddContact}
            >
              Add
            </Button>
          </>
        }
      >
        <form
          onSubmit={handleAddContact}
          className="space-y-4"
          id="add-contact-form"
        >
          <Input
            label="Name"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            placeholder="Contact name"
            autoFocus
          />
          <Input
            label="Email"
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            placeholder="contact@example.com"
          />
          <Input
            label="Wait Time (days)"
            type="number"
            value={String(contactWaitDays)}
            onChange={(e) => setContactWaitDays(Number(e.target.value))}
            hint="How many days they must wait before access is granted"
          />
        </form>
      </Modal>
    </div>
  );
}
