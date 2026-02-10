<?php
use App\Models\User;
use App\Models\Outlet;

$users = User::role(['admin', 'owner'])->get()->map(function($u) {
    return [
        'id' => $u->id,
        'username' => $u->username,
        'roles' => $u->getRoleNames(),
        'id_outlet' => $u->id_outlet,
        'outlet_nama' => $u->outlet?->nama
    ];
})->toArray();

file_put_contents('user_verification.json', json_encode($users, JSON_PRETTY_PRINT));
echo "Verification file created.\n";
