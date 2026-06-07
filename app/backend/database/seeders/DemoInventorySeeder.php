// In tinker: php artisan tinker
$clinic = \App\Models\Clinic::where('name', 'like', '%Nile%')->first();
$branch = \App\Models\Branch::where('clinic_id', $clinic->id)->first();

$items = [
    ['name'=>'Composite Resin A2','sku'=>'NSD-COM-A2','category'=>'restorative','supplier'=>'Medident Addis','location'=>'Cabinet 2','current_quantity'=>8,'reorder_threshold'=>30,'unit_cost'=>1550,'expiry_date'=>'2026-10-30'],
    ['name'=>'Nitrile Gloves Medium','sku'=>'NSD-GLOVES-M','category'=>'consumables','supplier'=>'Ethio Health Supply','location'=>'Central Store','current_quantity'=>220,'reorder_threshold'=>200,'unit_cost'=>40,'expiry_date'=>'2027-04-15'],
    ['name'=>'Lidocaine 2%','sku'=>'NSD-ANA-2','category'=>'pharmacy','supplier'=>'Aster Pharma','location'=>'Drug Cabinet','current_quantity'=>36,'reorder_threshold'=>48,'unit_cost'=>150,'expiry_date'=>'2026-08-01'],
    ['name'=>'Diamond Bur Set','sku'=>'NSD-BUR-SET','category'=>'instruments','supplier'=>'Dental Hub','location'=>'Sterilization Room','current_quantity'=>14,'reorder_threshold'=>20,'unit_cost'=>2000,'expiry_date'=>null],
];

foreach ($items as $item) {
    \App\Models\InventoryItem::create([...$item, 'clinic_id'=>$clinic->id, 'branch_id'=>$branch->id]);
}