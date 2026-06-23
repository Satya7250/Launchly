"use client";

import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

interface ReviewVersionSelectorProps {
  versions: Array<{ id: string; version: number; status: string; createdAt: string }>;
  selectedId: string;
  onSelect: (id: string) => void;
}

export function ReviewVersionSelector({ versions, selectedId, onSelect }: ReviewVersionSelectorProps) {
  return (
    <Select value={selectedId} onValueChange={onSelect}>
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="Select version" />
      </SelectTrigger>
      <SelectContent>
        {versions.map((v) => (
          <SelectItem key={v.id} value={v.id}>
            Version {v.version} ({v.status})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
