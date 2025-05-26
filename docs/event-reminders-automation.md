# Système de Rappels d'Événements Automatisés

## Vue d'ensemble

Le système de rappels d'événements permet aux organisateurs de programmer l'envoi automatique de rappels aux participants confirmés d'un événement. Les rappels peuvent être envoyés immédiatement ou programmés pour une date/heure spécifique.

## Architecture

### Composants principaux

1. **EventSchedulerService** : Service responsable du traitement automatique des rappels programmés
2. **ScheduledReminder** : Entité qui stocke les rappels programmés en base de données
3. **EventService** : Service principal qui gère la création et l'envoi des rappels
4. **MailService** : Service d'envoi d'emails avec templates détaillés

### Flux de fonctionnement

```
1. Utilisateur programme un rappel via l'interface
2. Rappel sauvegardé en base avec statut PENDING
3. Tâche CRON vérifie toutes les 5 minutes les rappels à envoyer
4. Rappels dus sont traités et envoyés
5. Statut mis à jour (SENT, FAILED, ou CANCELLED)
```

## Configuration des tâches CRON

### Traitement des rappels programmés

- **Fréquence** : Toutes les 5 minutes (`*/5 * * * *`)
- **Fonction** : `processScheduledReminders()`
- **Description** : Vérifie et traite les rappels dont la date d'envoi est passée

### Nettoyage des anciens rappels

- **Fréquence** : Tous les jours à 2h du matin
- **Fonction** : `cleanupOldReminders()`
- **Description** : Supprime les rappels de plus de 30 jours (SENT, FAILED, CANCELLED)

## Types de rappels

### Envoi immédiat

- Timing : `now`
- Traitement : Envoi direct sans sauvegarde en base

### Rappels programmés

- **1 heure avant** : Calculé automatiquement à partir de la date de début de l'événement
- **1 jour avant** : Calculé automatiquement à partir de la date de début de l'événement
- **Date personnalisée** : Date/heure spécifiée par l'utilisateur

## Statuts des rappels

- **PENDING** : Rappel en attente d'envoi
- **SENT** : Rappel envoyé avec succès
- **FAILED** : Échec de l'envoi (erreur sauvegardée)
- **CANCELLED** : Rappel annulé (événement supprimé/annulé ou annulation manuelle)

## Gestion des erreurs

### Erreurs individuelles

- Les erreurs d'envoi à un participant n'affectent pas les autres
- Utilisation de `Promise.allSettled()` pour traiter tous les participants

### Erreurs globales

- Rappel marqué comme FAILED avec message d'erreur
- Logs détaillés pour le debugging

### Cas d'annulation automatique

- Événement supprimé ou annulé
- Aucun participant confirmé
- Participant non trouvé

## API Endpoints

### Programmer/Envoyer des rappels

```
POST /groups/:groupId/events/:eventId/reminders
```

### Récupérer les rappels programmés

```
GET /groups/:groupId/events/:eventId/scheduled-reminders
```

### Annuler un rappel programmé

```
DELETE /groups/:groupId/events/:eventId/scheduled-reminders/:reminderId
```

## Types de notifications envoyées

### Participants internes (utilisateurs de la plateforme)

- **Notification push** : Via Firebase Cloud Messaging
- **Email détaillé** : Template HTML avec tous les détails de l'événement

### Participants externes

- **Email uniquement** : Template HTML avec tous les détails de l'événement

## Template d'email

Le template d'email inclut :

- Logo Sonar Artists
- Message personnalisé (optionnel)
- Détails complets de l'événement (titre, description, dates, lieu, statut)
- Lien vers l'événement sur la plateforme
- Formatage des dates en français

## Migrations de base de données

Pour la production, exécuter les migrations :

```bash
npm run migration:run
```

### Migrations incluses

1. **AddErrorMessageAndSentAtToScheduledReminder** : Ajoute les colonnes `errorMessage` et `sentAt` à la table `scheduled_reminder`

2. **AddEventRelationToScheduledReminder** :
   - Ajoute la contrainte de clé étrangère entre `scheduled_reminder.eventId` et `event.id`
   - Crée un index sur `eventId` pour améliorer les performances
   - Crée un index composite sur `status` et `scheduledDate` pour optimiser les requêtes du scheduler
   - Configure `ON DELETE CASCADE` pour supprimer automatiquement les rappels quand un événement est supprimé

## Monitoring et logs

### Logs disponibles

- Vérification des rappels (toutes les 5 minutes)
- Traitement de chaque rappel individuel
- Erreurs d'envoi avec stack trace
- Nettoyage des anciens rappels

### Métriques suggérées

- Nombre de rappels traités par jour
- Taux de succès/échec des envois
- Temps de traitement moyen

## Sécurité

- Authentification JWT requise pour tous les endpoints
- Vérification des droits d'accès au groupe
- Validation des données d'entrée avec class-validator

## Performance

### Optimisations implémentées

- Traitement par batch des rappels
- Requêtes optimisées avec relations
- Nettoyage automatique des anciennes données

### Recommandations

- Surveiller la charge lors du traitement de nombreux rappels
- Considérer l'ajout d'une queue (Redis/Bull) pour de gros volumes
- Indexer les colonnes `status` et `scheduledDate` si nécessaire

## Dépendances

- `@nestjs/schedule` : Gestion des tâches CRON
- `typeorm` : ORM pour la base de données
- `resend` : Service d'envoi d'emails
- `firebase-admin` : Notifications push
