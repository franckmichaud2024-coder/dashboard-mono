# Expédition

Application React/Vite conçue pour être déployée sur Vercel avec Supabase.

## Installation locale

```bash
npm install
cp .env.example .env.local
npm run dev
```

Ajoutez ensuite dans `.env.local` :

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

## Supabase

Exécutez le fichier `supabase/schema.sql` dans l'éditeur SQL de Supabase.

## Vercel

Ajoutez les mêmes variables dans :
Project Settings → Environment Variables

Puis déployez le dépôt.

## Données partagées

Les pages Employés, Vacances, Horaire et Gestion des banques utilisent maintenant la même source `src/data/employees.js`.

## Menu personnalisable

Les onglets de la barre latérale sont réorganisables par glisser-déposer. L'ordre est sauvegardé dans le navigateur et peut être réinitialisé.

## Version 1.4

Le module Horaire a été retiré du menu et du projet.
