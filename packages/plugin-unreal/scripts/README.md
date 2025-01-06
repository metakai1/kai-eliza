# Database Seeding Scripts

This directory contains scripts for seeding the database with initial data.

## Setup

1. Copy `.env.example` to `.env` and update with your database credentials:
```bash
cp .env.example .env
```

2. Install dependencies if you haven't already:
```bash
npm install
```

## Available Scripts

### seed-database.ts

This script seeds the database with land plot data from a CSV file.

Usage:
```bash
npx ts-node scripts/seed-database.ts
```

The script expects a CSV file at `data/land_plots.csv` with the following columns:
- id: Unique identifier for the land plot
- rank: Numerical ranking
- name: Plot name/identifier
- neighborhood: Location/neighborhood name
- zoning: ZoningType (Residential, Commercial, Industrial, Mixed Use, Legendary)
- plotSize: PlotSize (Nano, Micro, Mini, Mid, Macro, Mega, Mammoth, Giga)
- buildingType: BuildingType (Lowrise, Midrise, Highrise, Tall, Supertall, Megatall)
- oceanDistance: Distance to ocean in meters
- oceanCategory: DistanceCategory (Close, Medium, Far)
- bayDistance: Distance to bay in meters
- bayCategory: DistanceCategory (Close, Medium, Far)
- description: Detailed description of the property

## Error Handling

The script includes error handling and will:
- Log successful insertions
- Log any errors that occur during the process
- Exit with status code 1 if any errors occur
- Exit with status code 0 on successful completion
