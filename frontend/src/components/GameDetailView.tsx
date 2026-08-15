import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ExternalLink,
  Plus,
  Check,
  Loader2,
  Download,
  RefreshCw,
  Pencil,
  Trash2,
  Cpu,
} from "lucide-react";
import { ScreenshotCarousel } from "./ScreenshotCarousel";
import { UpdateBadge } from "./UpdateBadge";
import { ConfirmModal } from "./ConfirmModal";
import {
  GameStatus,
  DevStatus,
  STATUS_LABELS,
  STATUS_COLORS,
  DEV_STATUS_LABELS,
  DEV_STATUS_COLORS,
} from "../types/game";

export interface Screenshot {
  thumbnail: string;
  url: string;
}

export interface LibraryFullInfo {
  id: string;
  status: GameStatus;
  devStatus: DevStatus;
  myVersion: string;
  latestVersion: string;
  hasUpdate: boolean;
  downloadUrl?: string;
  notes?: string;
  addedAt: string;
  updatedAt: string;
}

export interface GameDetailViewProps {
  source: "vndb" | "f95" | "manual";

  title: string;
  developer?: string;
  coverUrl?: string;
  description?: string;
  tags: string[];
  screenshots: Screenshot[];
  externalUrl?: string;
  engine?: string;

  vndbId?: string;

  libraryGame?: LibraryFullInfo | null;
  onEdit?: () => void;
  onDelete?: () => void;
  onSync?: () => void;
  syncing?: boolean;

  imported: boolean;
  importing: boolean;
  onImport: () => void;
}

const TAGS_INITIAL = 15;

const SOURCE_LABEL: Record<string, string> = {
  vndb: "Visual Novel",
  f95: "F95Zone",
};

const EXTERNAL_LINK_LABEL: Record<string, string> = {
  vndb: "View on VNDB",
  f95: "View on F95Zone",
};

function cleanDescription(text: string): string {
  return text
    .replace(/\[url=[^\]]+\]([^\[]+)\[\/url\]/g, "$1")
    .replace(/\[.*?\]/g, "");
}

export function GameDetailView({
  source,
  title,
  developer,
  coverUrl,
  description,
  tags,
  screenshots,
  externalUrl,
  engine,
  vndbId,
  libraryGame,
  onEdit,
  onDelete,
  onSync,
  syncing,
  imported,
  importing,
  onImport,
}: GameDetailViewProps) {
  const navigate = useNavigate();
  const [tagsExpanded, setTagsExpanded] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);

  const visibleTags = tagsExpanded ? tags : tags.slice(0, TAGS_INITIAL);
  const hiddenCount = tags.length - TAGS_INITIAL;

  return (
    <>
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 transition-colors font-medium mb-6"
        >
          <ArrowLeft size={15} />
          Back
        </button>

        <div className="grid grid-cols-1 md:grid-cols-[16rem_1fr] gap-8">
          {/* Sidebar */}
          <div>
            <div className="w-full aspect-2/3 bg-stone-100 dark:bg-stone-800 rounded-2xl overflow-hidden shadow-lg">
              {coverUrl ? (
                <img
                  src={coverUrl}
                  alt={title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-stone-400 text-sm">
                  No cover
                </div>
              )}
            </div>

            <div className="mt-4 flex flex-col gap-2">
              {libraryGame ? (
                <>
                  {libraryGame.downloadUrl && (
                    <a
                      href={libraryGame.downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-semibold transition-colors"
                    >
                      <Download size={15} />
                      Download
                    </a>
                  )}
                  <div className="flex gap-2">
                    <button
                      data-testid="edit-game-btn"
                      onClick={onEdit}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-xl text-sm font-medium transition-colors border border-stone-200 dark:border-stone-700"
                    >
                      <Pencil size={14} />
                      Edit
                    </button>
                    <button
                      onClick={() => setShowRemoveModal(true)}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-rose-50 dark:bg-rose-900/20 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 rounded-xl text-sm font-medium transition-colors border border-rose-200 dark:border-rose-800"
                    >
                      <Trash2 size={14} />
                      Remove
                    </button>
                  </div>
                </>
              ) : (
                <button
                  onClick={onImport}
                  disabled={imported || importing}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60 ${
                    imported
                      ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                      : "bg-amber-600 hover:bg-amber-700 text-white"
                  }`}
                >
                  {importing ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : imported ? (
                    <Check size={15} />
                  ) : (
                    <Plus size={15} />
                  )}
                  {imported ? "Added to Library" : "Add to Library"}
                </button>
              )}

              {externalUrl && (
                <a
                  href={externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 py-2.5 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-xl text-sm font-medium transition-colors border border-stone-200 dark:border-stone-700"
                >
                  <ExternalLink size={14} />
                  {EXTERNAL_LINK_LABEL[source] ?? "View Source"}
                </a>
              )}
            </div>
          </div>

          {/* Main content */}
          <div className="min-w-0">
            {/* Header */}
            <div className="mb-6">
              {libraryGame ? (
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full border font-semibold ${STATUS_COLORS[libraryGame.status]}`}
                  >
                    {STATUS_LABELS[libraryGame.status]}
                  </span>
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full border font-semibold ${DEV_STATUS_COLORS[libraryGame.devStatus]}`}
                  >
                    {DEV_STATUS_LABELS[libraryGame.devStatus]}
                  </span>
                  <UpdateBadge hasUpdate={libraryGame.hasUpdate} />
                  {engine && (
                    <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 rounded-full border border-stone-200 dark:border-stone-700">
                      <Cpu size={11} />
                      {engine}
                    </span>
                  )}
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  {SOURCE_LABEL[source] && (
                    <p className="text-xs font-bold text-stone-500 dark:text-stone-500 uppercase tracking-widest">
                      {SOURCE_LABEL[source]}
                    </p>
                  )}
                  {engine && (
                    <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 rounded-full border border-stone-200 dark:border-stone-700">
                      <Cpu size={11} />
                      {engine}
                    </span>
                  )}
                </div>
              )}
              <h1 className="text-3xl font-bold text-stone-900 dark:text-stone-100 leading-tight">
                {title}
              </h1>
              {developer && (
                <p className="text-base text-stone-500 dark:text-stone-500 mt-1">
                  {developer}
                </p>
              )}
            </div>

            <div className="space-y-6">
              {description && (
                <div className="bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 rounded-2xl p-5">
                  <h2 className="text-xs font-bold text-stone-500 dark:text-stone-500 uppercase tracking-widest mb-3">
                    Description
                  </h2>
                  <p className="text-sm text-stone-700 dark:text-stone-300 leading-relaxed whitespace-pre-wrap">
                    {cleanDescription(description)}
                  </p>
                </div>
              )}

              {screenshots.length > 0 && (
                <div>
                  <h2 className="text-xs font-bold text-stone-500 dark:text-stone-500 uppercase tracking-widest mb-3">
                    Screenshots ({screenshots.length})
                  </h2>
                  <ScreenshotCarousel screenshots={screenshots} />
                </div>
              )}

              {libraryGame && (
                <div className="bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 rounded-2xl p-5">
                  <h2 className="text-xs font-bold text-stone-500 dark:text-stone-500 uppercase tracking-widest mb-4">
                    Version
                  </h2>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <p className="text-xs text-stone-500 dark:text-stone-500 mb-2">
                        Version I Played
                      </p>
                      <p className="font-mono text-xl font-bold text-stone-900 dark:text-stone-100">
                        {libraryGame.myVersion || (
                          <span className="text-stone-400 dark:text-stone-600 font-normal text-base">
                            —
                          </span>
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-stone-500 dark:text-stone-500 mb-2">
                        Latest Version
                      </p>
                      <div className="flex items-center gap-2">
                        <p
                          className={`font-mono text-xl font-bold ${libraryGame.hasUpdate ? "text-amber-600 dark:text-amber-400" : "text-stone-900 dark:text-stone-100"}`}
                        >
                          {libraryGame.latestVersion || (
                            <span className="text-stone-400 dark:text-stone-600 font-normal text-base">
                              —
                            </span>
                          )}
                        </p>
                        {onSync && (
                          <button
                            onClick={onSync}
                            disabled={syncing}
                            className="p-1.5 rounded-lg text-stone-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 disabled:opacity-40 transition-colors"
                            title="Sync latest version"
                          >
                            <RefreshCw
                              size={14}
                              className={syncing ? "animate-spin" : ""}
                            />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  {libraryGame.hasUpdate && (
                    <div className="mt-4 pt-4 border-t border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-900/10 rounded-xl p-3">
                      <p className="text-sm text-amber-700 dark:text-amber-400">
                        New version available:{" "}
                        <span className="font-mono font-bold">
                          {libraryGame.latestVersion}
                        </span>
                        {libraryGame.downloadUrl && (
                          <a
                            href={libraryGame.downloadUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-3 inline-flex items-center gap-1 underline hover:no-underline"
                          >
                            <Download size={12} /> Download
                          </a>
                        )}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {tags.length > 0 && (
                <div>
                  <h2 className="text-xs font-bold text-stone-500 dark:text-stone-500 uppercase tracking-widest mb-3">
                    Tags
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {visibleTags.map((tag) => (
                      <span
                        key={tag}
                        className="px-3 py-1.5 bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 rounded-xl text-sm font-medium border border-stone-200 dark:border-stone-700"
                      >
                        {tag}
                      </span>
                    ))}
                    {!tagsExpanded && hiddenCount > 0 && (
                      <button
                        onClick={() => setTagsExpanded(true)}
                        className="px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 rounded-xl text-sm font-medium border border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
                      >
                        +{hiddenCount} more
                      </button>
                    )}
                    {tagsExpanded && hiddenCount > 0 && (
                      <button
                        onClick={() => setTagsExpanded(false)}
                        className="px-3 py-1.5 bg-stone-50 dark:bg-stone-800 text-stone-500 rounded-xl text-sm font-medium border border-stone-200 dark:border-stone-700 hover:bg-stone-100 transition-colors"
                      >
                        Show less
                      </button>
                    )}
                  </div>
                </div>
              )}

              {libraryGame?.notes && (
                <div>
                  <h2 className="text-xs font-bold text-stone-500 dark:text-stone-500 uppercase tracking-widest mb-3">
                    Notes
                  </h2>
                  <div className="bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 rounded-2xl p-5">
                    <p className="text-sm text-stone-700 dark:text-stone-300 whitespace-pre-wrap leading-relaxed">
                      {libraryGame.notes}
                    </p>
                  </div>
                </div>
              )}

              {libraryGame ? (
                <div className="text-xs text-stone-400 dark:text-stone-600 space-y-0.5 pt-2 border-t border-stone-100 dark:border-stone-800">
                  {vndbId && (
                    <p>
                      VNDB: <span className="font-mono">{vndbId}</span>
                    </p>
                  )}
                  <p>
                    Added {new Date(libraryGame.addedAt).toLocaleDateString()}
                  </p>
                  <p>
                    Updated{" "}
                    {new Date(libraryGame.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              ) : vndbId ? (
                <p className="text-xs text-stone-400 dark:text-stone-600">
                  VNDB ID: {vndbId}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {showRemoveModal && (
        <ConfirmModal
          title={`Remove "${title}" from library?`}
          message="Your status, notes, and version history for this game will be lost."
          confirmLabel="Remove"
          onConfirm={() => {
            setShowRemoveModal(false);
            onDelete?.();
          }}
          onCancel={() => setShowRemoveModal(false)}
        />
      )}
    </>
  );
}
