"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Check } from "lucide-react";
import { updateNoteProject } from "@/app/protected/notes/actions";

interface Project {
  id: string;
  name: string;
}

interface ProjectBadgeMenuProps {
  noteId: string;
  currentProject: Project;
  allProjects: Project[];
}

export function ProjectBadgeMenu({ noteId, currentProject, allProjects }: ProjectBadgeMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  async function handleProjectChange(projectId: string) {
    setIsUpdating(true);
    await updateNoteProject(noteId, projectId);
    setIsUpdating(false);
    setIsOpen(false);
  }

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        disabled={isUpdating}
        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-mono hover:bg-primary/20 transition-colors"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
        {currentProject.name}
      </button>

      {isOpen && (
        <>
          {/* Backdrop to close menu */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown menu */}
          <Card className="absolute z-50 mt-1 min-w-[200px] max-h-64 overflow-y-auto left-0">
            <div className="py-1">
              <div className="px-3 py-2 text-xs font-mono text-muted-foreground border-b">
                Move to project
              </div>
              {allProjects.map((project) => (
                <button
                  key={project.id}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleProjectChange(project.id);
                  }}
                  disabled={isUpdating}
                  className="w-full text-left px-3 py-2 text-sm font-mono hover:bg-accent transition-colors flex items-center justify-between gap-2"
                >
                  <span className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                    {project.name}
                  </span>
                  {project.id === currentProject.id && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </button>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
