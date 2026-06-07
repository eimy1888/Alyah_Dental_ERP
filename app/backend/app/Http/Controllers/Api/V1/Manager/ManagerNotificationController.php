<?php

namespace App\Http\Controllers\Api\V1\Manager;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Notifications\DatabaseNotification;

class ManagerNotificationController extends Controller
{
    /**
     * GET /api/v1/manager/notifications
     * Get all notifications for the logged-in manager
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
     * GET /api/v1/manager/notifications/count
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
     * PUT /api/v1/manager/notifications/{id}/read
     * Mark a single notification as read
     */
    public function markRead(Request $request, string $id): JsonResponse
    {
        $user = $request->user();
        $notification = $user->notifications()->findOrFail($id);
        $notification->markAsRead();
        
        return response()->json([
            'success' => true,
            'message' => 'Notification marked as read.',
        ]);
    }
    
    /**
     * PUT /api/v1/manager/notifications/read-all
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
}