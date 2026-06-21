<?php

namespace App\Http\Controllers\Api\V1\Clinic;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Document;
use App\Models\Patient;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class DocumentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = Document::forClinic($user->clinic_id)
            ->with(['patient:id,first_name,last_name', 'uploader:id,name'])
            ->orderByDesc('created_at');

        if ($request->filled('branch_id')) $query->where('branch_id', $request->integer('branch_id'));
        if ($request->filled('patient_id')) $query->where('patient_id', $request->integer('patient_id'));
        if ($request->filled('category')) $query->where('category', $request->category);
        if (!$request->boolean('include_archived')) $query->where('is_archived', false);
        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(fn($q) => $q->where('title', 'like', "%{$s}%")->orWhere('original_name', 'like', "%{$s}%"));
        }

        $docs = $query->paginate(min((int) ($request->per_page ?? 25), 100));

        return response()->json([
            'success' => true,
            'data' => collect($docs->items())->map(fn(Document $doc) => $this->format($doc)),
            'meta' => [
                'total' => $docs->total(),
                'current_page' => $docs->currentPage(),
                'last_page' => $docs->lastPage(),
                'per_page' => $docs->perPage(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $user = $request->user();
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'category' => 'nullable|string|max:80',
            'patient_id' => 'nullable|exists:patients,id',
            'parent_document_id' => 'nullable|exists:documents,id',
            'file' => 'required|file|mimes:pdf,jpg,jpeg,png,doc,docx,xls,xlsx|max:10240',
        ]);

        if (!empty($validated['patient_id'])) {
            Patient::where('clinic_id', $user->clinic_id)->findOrFail($validated['patient_id']);
        }

        $parent = null;
        if (!empty($validated['parent_document_id'])) {
            $parent = Document::forClinic($user->clinic_id)->findOrFail($validated['parent_document_id']);
        }

        $file = $request->file('file');
        $path = $file->store("documents/clinic-{$user->clinic_id}", 'local');
        $version = $parent ? ((int) $parent->versions()->max('version') ?: (int) $parent->version) + 1 : 1;

        $doc = Document::create([
            'clinic_id' => $user->clinic_id,
            'branch_id' => $user->branch_id,
            'patient_id' => $validated['patient_id'] ?? null,
            'uploaded_by' => $user->id,
            'parent_document_id' => $parent?->id,
            'title' => $validated['title'],
            'category' => $validated['category'] ?? 'general',
            'file_path' => $path,
            'original_name' => $file->getClientOriginalName(),
            'mime_type' => $file->getMimeType() ?: 'application/octet-stream',
            'file_size' => $file->getSize() ?: 0,
            'version' => $version,
        ]);

        AuditLog::record('document.uploaded', [
            'subject_type' => Document::class,
            'subject_id' => $doc->id,
            'subject_label' => $doc->title,
            'branch_id' => $doc->branch_id,
            'new_values' => ['category' => $doc->category, 'version' => $doc->version],
        ], $request, $user);

        return response()->json(['success' => true, 'data' => $this->format($doc)], 201);
    }

    public function show(Request $request, Document $document): JsonResponse
    {
        $this->authorizeDocument($request, $document);
        $document->load(['patient:id,first_name,last_name', 'uploader:id,name', 'versions']);
        return response()->json(['success' => true, 'data' => $this->format($document, true)]);
    }

    public function download(Request $request, Document $document): StreamedResponse|JsonResponse
    {
        $this->authorizeDocument($request, $document);
        if (!Storage::disk('local')->exists($document->file_path)) {
            return response()->json(['success' => false, 'message' => 'File not found.'], 404);
        }
        return Storage::disk('local')->download($document->file_path, $document->original_name);
    }

    public function archive(Request $request, Document $document): JsonResponse
    {
        $this->authorizeDocument($request, $document);
        $document->update(['is_archived' => true, 'archived_at' => now(), 'archived_by' => $request->user()->id]);
        AuditLog::record('document.archived', ['subject_type' => Document::class, 'subject_id' => $document->id, 'subject_label' => $document->title], $request);
        return response()->json(['success' => true, 'data' => $this->format($document->fresh())]);
    }

    public function restore(Request $request, Document $document): JsonResponse
    {
        $this->authorizeDocument($request, $document);
        $document->update(['is_archived' => false, 'archived_at' => null, 'archived_by' => null]);
        AuditLog::record('document.restored', ['subject_type' => Document::class, 'subject_id' => $document->id, 'subject_label' => $document->title], $request);
        return response()->json(['success' => true, 'data' => $this->format($document->fresh())]);
    }

    private function authorizeDocument(Request $request, Document $document): void
    {
        abort_unless((int) $document->clinic_id === (int) $request->user()->clinic_id, 404);
    }

    private function format(Document $doc, bool $withVersions = false): array
    {
        $data = [
            'id' => $doc->id,
            'title' => $doc->title,
            'category' => $doc->category,
            'patient_id' => $doc->patient_id,
            'patient_name' => $doc->patient ? $doc->patient->full_name : null,
            'original_name' => $doc->original_name,
            'mime_type' => $doc->mime_type,
            'file_size' => $doc->file_size,
            'version' => $doc->version,
            'is_archived' => $doc->is_archived,
            'uploaded_by' => $doc->uploader?->name,
            'created_at' => $doc->created_at?->toDateTimeString(),
        ];

        if ($withVersions) {
            $data['versions'] = $doc->versions->map(fn(Document $v) => [
                'id' => $v->id,
                'version' => $v->version,
                'original_name' => $v->original_name,
                'created_at' => $v->created_at?->toDateTimeString(),
            ]);
        }

        return $data;
    }
}
