# Tableau de bord PMO

Application locale de tableau de bord PMO connectée à un fichier Excel. L'API relit le classeur à chaque appel, donc les KPI changent dès que le fichier Excel source est enregistré.

## Modèle de données

Le modèle PMO suit la hiérarchie :

```text
Pôle -> Filiale / Entité -> Secteur -> Projet -> Suivi mensuel
```

Les projets portent notamment :

- code projet, nom, client, pays, localisation ;
- responsables pôle, filiale, secteur, directeur et responsable projet ;
- dates début, fin contractuelle, fin prolongée et durée ;
- coût marché HT/TTC, budget, valeur acquise, dépenses, SPI, CPI, avancement physique ;
- statut, risques, décisions attendues et observations.

## Générer le modèle Excel

Lancer l'application puis télécharger :

```text
http://127.0.0.1:8000/api/template
```

Le bouton `Modele Excel` dans l'interface télécharge le même fichier.

## Connecter un fichier Excel

Par défaut, l'application lit :

```powershell
D:\PMO\tableau de Bord PMO.xlsx
```

Pour connecter le modèle rempli ou un fichier déposé dans un dossier cloud synchronisé, pointer la variable vers le fichier local synchronisé :

```powershell
$env:PMO_EXCEL_PATH="C:\Users\hp\OneDrive\PMO\modele_pmo.xlsx"
python app.py
```

Le même principe fonctionne avec SharePoint, OneDrive, Google Drive Desktop ou tout répertoire cloud qui synchronise un fichier `.xlsx` sur la machine.

## Lancer l'application

```powershell
pip install -r requirements.txt
python app.py
```

Ouvrir ensuite :

```text
http://127.0.0.1:8000
```

## Analyses disponibles

- Vue globale portefeuille.
- Analyses par pôle, filiale, secteur et localisation.
- Analyse mensuelle via l'onglet `Suivi mensuel` du modèle.
- Liste projets filtrable par période, pôle, filiale et statut.
- Risques et décisions attendues.
