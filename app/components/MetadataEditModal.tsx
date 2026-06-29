import { useEffect, useRef, useState } from 'react';
import { FaX } from 'react-icons/fa6';
import { useFetcher } from 'react-router';
import { Label } from '~/components/Form/Label';
import { useFocusTrap } from '~/hooks/useFocusTrap';
import { makeClassName } from '~/lib/makeClassName';
import { idToSqid } from '~/lib/sqids';
import { Button } from './Button';

export type MetadataEditModalProps = {
  comicId: number;
  comicFileName: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialMetadata?: EditMetadata;
  metadataSource?: { provider: string; id: string };
};

type EditMetadata = {
  series?: string;
  number?: string;
  volume?: string;
  title?: string;
  publisher?: string;
  summary?: string;
  releaseDate?: string;
  writer?: string;
  penciller?: string;
  inker?: string;
  colorist?: string;
  letterer?: string;
  coverArtist?: string;
  editor?: string;
};

type LoadResponse = {
  metadata: EditMetadata;
};

type SaveResponse = {
  success: boolean;
  message: string;
};

const Input = ({
  id,
  name,
  type = 'text',
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) => {
  const classNames = makeClassName(
    'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500',
    className,
  );
  return <input {...props} id={id || name} name={name} type={type} className={classNames} />;
};

const Textarea = ({
  id,
  name,
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => {
  const classNames = makeClassName(
    'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500',
    className,
  );
  return <textarea {...props} id={id || name} name={name} className={classNames} />;
};

const InputWithLabel = ({
  label,
  ...inputProps
}: {
  label: string;
} & React.InputHTMLAttributes<HTMLInputElement>) => {
  return (
    <div>
      <Label
        className="text-gray-700 dark:text-gray-300"
        htmlFor={inputProps.id || inputProps.name}
      >
        {label}
      </Label>
      <Input {...inputProps} />
    </div>
  );
};

const TextareaWithLabel = ({
  label,
  ...textareaProps
}: {
  label: string;
} & React.TextareaHTMLAttributes<HTMLTextAreaElement>) => {
  return (
    <div>
      <Label
        className="text-gray-700 dark:text-gray-300"
        htmlFor={textareaProps.id || textareaProps.name}
      >
        {label}
      </Label>
      <Textarea {...textareaProps} />
    </div>
  );
};

export function MetadataEditModal({
  comicId,
  comicFileName,
  isOpen,
  onClose,
  onSuccess,
  initialMetadata,
  metadataSource,
}: MetadataEditModalProps) {
  const loadFetcher = useFetcher<LoadResponse>();
  const saveFetcher = useFetcher<SaveResponse>();
  const previousSaveStateRef = useRef<'idle' | 'submitting' | 'loading'>('idle');
  const focusTrapRef = useFocusTrap<HTMLDivElement>(isOpen);

  const [formData, setFormData] = useState<EditMetadata>({});

  // Load existing metadata when modal opens (if no initial metadata provided)
  useEffect(() => {
    if (isOpen && !initialMetadata && loadFetcher.state === 'idle' && !loadFetcher.data) {
      loadFetcher.load(`/comics/${idToSqid(comicId)}/metadata-edit`);
    }
  }, [isOpen, comicId, loadFetcher, initialMetadata]);

  // Populate form when data loads or initial metadata is provided
  useEffect(() => {
    if (isOpen) {
      if (initialMetadata) {
        setFormData(initialMetadata);
      } else if (loadFetcher.data?.metadata) {
        setFormData(loadFetcher.data.metadata);
      }
    }
  }, [isOpen, initialMetadata, loadFetcher.data]);

  // Handle successful save
  useEffect(() => {
    const justFinished =
      (previousSaveStateRef.current === 'loading' ||
        previousSaveStateRef.current === 'submitting') &&
      saveFetcher.state === 'idle';

    previousSaveStateRef.current = saveFetcher.state;

    if (justFinished && saveFetcher.data?.success) {
      if (onSuccess) {
        onSuccess();
      }
      onClose();
    }
  }, [saveFetcher.state, saveFetcher.data, onSuccess, onClose]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({});
    }
  }, [isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = () => {
    saveFetcher.submit(
      {
        metadata: formData,
        ...(metadataSource && { source: metadataSource }),
      },
      {
        method: 'POST',
        action: `/comics/${idToSqid(comicId)}/metadata-edit`,
        encType: 'application/json',
      },
    );
  };

  if (!isOpen) return null;

  const isLoading = !initialMetadata && loadFetcher.state === 'loading';
  const isSaving = saveFetcher.state === 'submitting' || saveFetcher.state === 'loading';
  const saveError =
    saveFetcher.data && 'error' in saveFetcher.data ? (saveFetcher.data as any).error : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={isSaving ? undefined : onClose}
    >
      <div
        ref={focusTrapRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="metadata-edit-title"
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col relative"
        onClick={(e) => e.stopPropagation()}
      >
        {isSaving && (
          <div className="absolute inset-0 bg-white/90 dark:bg-gray-800/90 z-50 flex items-center justify-center">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-orange-600 border-t-transparent" />
              <p className="mt-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
                Saving Metadata
              </p>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Updating comic file and database...
              </p>
            </div>
          </div>
        )}

        <div className="border-b border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 id="metadata-edit-title" className="text-xl font-semibold">
                Edit Metadata
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{comicFileName}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
              disabled={isSaving}
            >
              <FaX />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600" />
                <p className="mt-2 text-gray-600 dark:text-gray-400">Loading metadata...</p>
              </div>
            </div>
          )}

          {saveError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-4 text-red-800 dark:text-red-200 mb-4">
              <p className="font-semibold">Failed to save metadata</p>
              <p className="text-sm mt-1">{saveError}</p>
            </div>
          )}

          {!isLoading && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div>
                <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">
                  Basic Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InputWithLabel
                    label="Series"
                    name="series"
                    value={formData.series || ''}
                    onChange={handleInputChange}
                  />

                  <InputWithLabel
                    label="Number"
                    name="number"
                    value={formData.number || ''}
                    onChange={handleInputChange}
                  />

                  <InputWithLabel
                    label="Volume"
                    name="volume"
                    value={formData.volume || ''}
                    onChange={handleInputChange}
                  />

                  <InputWithLabel
                    label="Title"
                    name="title"
                    value={formData.title || ''}
                    onChange={handleInputChange}
                  />

                  <InputWithLabel
                    label="Publisher"
                    name="publisher"
                    value={formData.publisher || ''}
                    onChange={handleInputChange}
                  />

                  <InputWithLabel
                    label="Release Date (YYYY-MM-DD)"
                    name="releaseDate"
                    value={formData.releaseDate || ''}
                    onChange={handleInputChange}
                    placeholder="2024-01-15"
                  />
                </div>
              </div>

              {/* Summary */}
              <TextareaWithLabel
                label="Summary"
                name="summary"
                value={formData.summary || ''}
                onChange={handleInputChange}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />

              {/* Creators */}
              <div>
                <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">
                  Creators
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Enter multiple names separated by commas
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InputWithLabel
                    label="Writer(s)"
                    name="writer"
                    value={formData.writer || ''}
                    onChange={handleInputChange}
                    placeholder="John Smith, Jane Doe"
                  />

                  <InputWithLabel
                    label="Penciller(s)"
                    name="penciller"
                    value={formData.penciller || ''}
                    onChange={handleInputChange}
                    placeholder="John Smith, Jane Doe"
                  />

                  <InputWithLabel
                    label="Inker(s)"
                    name="inker"
                    value={formData.inker || ''}
                    onChange={handleInputChange}
                    placeholder="John Smith, Jane Doe"
                  />

                  <InputWithLabel
                    label="Colorist(s)"
                    name="colorist"
                    value={formData.colorist || ''}
                    onChange={handleInputChange}
                    placeholder="John Smith, Jane Doe"
                  />

                  <InputWithLabel
                    label="Letterer(s)"
                    name="letterer"
                    value={formData.letterer || ''}
                    onChange={handleInputChange}
                    placeholder="John Smith, Jane Doe"
                  />

                  <InputWithLabel
                    label="Cover Artist(s)"
                    name="coverArtist"
                    value={formData.coverArtist || ''}
                    onChange={handleInputChange}
                    placeholder="John Smith, Jane Doe"
                  />

                  <InputWithLabel
                    label="Editor(s)"
                    name="editor"
                    value={formData.editor || ''}
                    onChange={handleInputChange}
                    placeholder="John Smith, Jane Doe"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 p-4 flex items-center justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || isLoading}>
            {isSaving ? 'Saving...' : 'Save Metadata'}
          </Button>
        </div>
      </div>
    </div>
  );
}
