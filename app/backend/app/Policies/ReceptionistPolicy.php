<?php
// app/Policies/ReceptionistPolicy.php

namespace App\Policies;

use App\Models\User;

class ReceptionistPolicy
{
    /**
     * Allow all actions for receptionist role.
     * This is a blanket policy for demo purposes.
     */
    public function before(User $user, string $ability): bool|null
    {
        // Super admin can do everything
        if ($user->isSuperAdmin()) {
            return true;
        }

        // Receptionist can do everything in their allowed scope
        if ($user->isReceptionist()) {
            return true;
        }

        return null;
    }

    public function viewAny(User $user): bool
    {
        return $user->isReceptionist();
    }

    public function view(User $user): bool
    {
        return $user->isReceptionist();
    }

    public function create(User $user): bool
    {
        return $user->isReceptionist();
    }

    public function update(User $user): bool
    {
        return $user->isReceptionist();
    }

    public function delete(User $user): bool
    {
        return $user->isReceptionist();
    }
}