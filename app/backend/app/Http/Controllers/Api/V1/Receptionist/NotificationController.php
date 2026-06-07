<?php

namespace App\Http\Controllers\Api\V1\Receptionist;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    /**
     * GET /api/v1/receptionist/notifications
     * Get all notifications for the logged-in receptionist
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        
        $notifications = $user->notifications()
            ->orderByDesc('created_at')
            ->limit(50)
            ->get()
            ->map(function ($notification) {
                $data = $notification->data;
                return [
                    'id' => $notification->id,
                    'type' => $data['type'] ?? 'general',
                    'title' => $data['title'] ?? 'Notification',
                    'message' => $data['message'] ?? '',
                    'read_at' => $notification->read_at,
                    'created_at' => $notification->created_at->toDateTimeString(),
                    'action_url' => $data['action_url'] ?? $this->getActionUrl($data),
                    'data' => $data,
                ];
            });
        
        $unreadCount = $user->unreadNotifications()->count();
        
        return response()->json([
            'success' => true,
            'data' => $notifications,
            'unread' => $unreadCount,
        ]);
    }
    
    /**
     * GET /api/v1/receptionist/notifications/count
     * Get unread notification count only (for badge)
     */
    public function count(Request $request): JsonResponse
    {
        $user = $request->user();
        $count = $user->unreadNotifications()->count();
        
        return response()->json([
            'success' => true,
            'count' => $count,
        ]);
    }
    
    /**
     * PUT /api/v1/receptionist/notifications/{id}/read
     * Mark a single notification as read
     */
    public function markRead(Request $request, string $id): JsonResponse
    {
        $user = $request->user();
        $notification = $user->notifications()->findOrFail($id);
        
        if (!$notification->read_at) {
            $notification->markAsRead();
        }
        
        $data = $notification->data;
        $actionUrl = $data['action_url'] ?? $this->getActionUrl($data);
        
        return response()->json([
            'success' => true,
            'message' => 'Notification marked as read.',
            'action_url' => $actionUrl,
        ]);
    }
    
    /**
     * PUT /api/v1/receptionist/notifications/read-all
     * Mark all notifications as read
     */
    public function markAllRead(Request $request): JsonResponse
    {
        $user = $request->user();
        $user->unreadNotifications()->update(['read_at' => now()]);
        
        return response()->json([
            'success' => true,
            'message' => 'All notifications marked as read.',
        ]);
    }
    
    /**
     * Determine action URL based on notification type
     */
    private function getActionUrl(array $data): string
    {
        $type = $data['type'] ?? 'general';
        
        return match($type) {
            'appointment_booked', 'appointment_confirmed' => '/receptionist/appointments',
            'invoice_created' => '/receptionist/billing',
            default => '#',
        };
    }
}