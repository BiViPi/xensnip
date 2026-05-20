const fs = require('fs');

const path = 'e:/Work/XenSnip/xensnip/src-tauri/src/lib.rs';
let content = fs.readFileSync(path, 'utf8');

const lines = content.split('\n');

const newLines = [];
for (let i = 0; i < lines.length; i++) {
    if (i === 214) {
        newLines.push(lines[i]);
        newLines.push('        // Prevent exit when all windows close so the tray stays alive.');
        newLines.push('        // Allow exit only when the user explicitly clicks Quit from the tray.');
        newLines.push('        if let tauri::RunEvent::ExitRequested { api, .. } = &event {');
        newLines.push('            if !quit_requested_run.load(Ordering::Relaxed) {');
        newLines.push('                api.prevent_exit();');
        newLines.push('            }');
        newLines.push('        }');
        newLines.push('');
        newLines.push('        if let tauri::RunEvent::WindowEvent { label, event: tauri::WindowEvent::Destroyed, .. } = &event {');
        newLines.push('            if label.starts_with("pin-") {');
        newLines.push('                let pin_registry = _app_handle.state::<commands::PinRegistry>();');
        newLines.push('                let mut map = pin_registry.map.lock().unwrap();');
        newLines.push('                if let Some(asset_id) = map.remove(label) {');
        newLines.push('                    let asset_registry = _app_handle.state::<asset::AssetRegistry>();');
        newLines.push('                    let _ = asset_registry.release(&asset_id, label);');
        newLines.push('                    log::info!(target: "pin", "Cleaned up asset for closed pin window: {}", label);');
        newLines.push('                }');
        newLines.push('            }');
        newLines.push('        }');
        newLines.push('    });');
    } else if (i > 214 && i <= 235) {
        continue;
    } else {
        newLines.push(lines[i]);
    }
}

fs.writeFileSync(path, newLines.join('\n'));
console.log('Fixed lib.rs');
