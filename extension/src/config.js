/**
 * NeuroApply AI — Shared configuration
 *
 * ⬇️  THIS IS THE ONLY PLACE TO CHANGE THE BACKEND URL.
 * Local dev:   http://localhost:8000/api/v1
 * Production:  https://your-api.onrender.com/api/v1
 *
 * Loaded by:
 *   - background.js (service worker) via importScripts('../config.js')
 *   - popup.html    via <script src="../config.js">
 *   - profile.html  via <script src="../config.js">
 *
 * Remember: also add the matching origin to manifest.json "host_permissions".
 */
const NEUROAPPLY_API = 'http://localhost:8000/api/v1';
