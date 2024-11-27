sync-artsdata-ids
================

This script syncs ids in CMS by running SPARQL queries on Artsdata. Artsdata URIs in the CMS are added or removed.


Artdata URIs Added to CMS
-----------------------

This script gets a list of CMS entities (Collections: Events, Places, Organizations, People) missing a link to an Artsdata URI.  If everything is linked then the list is empty. If the list is not empty, it passes the list of CMS URIs (http://lod.footlight.io/resource/UUID) to `reconcile-entities.sparql` which returns the matching Artsdata IDs by looking up the CMS URIs previously loaded into Artsdata. Finally the script adds the Artsdata IDs to CMS.

Artsdata URIs Removed from CMS Events
--------------------
The script queries Artsdata using `unlink-entities.sparql` which returns a list of CMS and Artsdata Events that are linked together but have *different startDates*. This indicates that an event in CMS in incorrectly linked to Artsdata. The script removes the incorrect Artsdata URIs from CMS.  Note that CMS also has some internal business logic that removes Artsdata URIs when an event is edited in the CMS (i.e. event series with multiple dates is edited). However this script is ultimately responsible for unlinking Artsdata URIs and no other business logic in CMS is needed (existing internal business logic in the CMS code should be removed if issues arise). 