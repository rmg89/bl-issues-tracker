# BL Issues Tracker

Equipment & facility issues tracker for Brace Life Studios, built with Next.js + Airtable.

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Add environment variables
Create a `.env.local` file in the root (copy from `.env.local.example`):

```
AIRTABLE_API_KEY=your_personal_access_token
AIRTABLE_BASE_ID=appmje1C3R0e2huqy
```

### 3. Run locally
```bash
npm run dev
```
Visit http://localhost:3000

## Deploy to Vercel

1. Push this folder to a GitHub repo
2. Go to vercel.com → New Project → import the repo
3. In Vercel project settings → Environment Variables, add:
   - `AIRTABLE_API_KEY` = your token
   - `AIRTABLE_BASE_ID` = appmje1C3R0e2huqy
4. Deploy

## Airtable Setup

Base: **BL Issues Tracker**

**Users table fields:**
- Name (Single line text)
- Username (Single line text)
- PIN (Single line text)
- IsAdmin (Checkbox)

**Issues table fields:**
- Title (Single line text)
- Description (Long text)
- Urgency (Single select: low / medium / high)
- Location (Single line text)
- Status (Single select: submitted / identified / discussing / solved / archived)
- SubmittedBy (Single line text)
- SubmittedByName (Single line text)
- AssignedTo (Single line text)
- RealIssue (Long text)
- Solution (Long text)
- Notes (Long text — stores JSON array)
- CreatedAt (Date with time)

## Default accounts
| Name | Username | PIN | Admin |
|------|----------|-----|-------|
| Ryan | ryan | 1234 | ✓ |
| Robert | robert | 5678 | ✓ |
| Salim | salim | 9012 | ✓ |
| Trainer Demo | trainer1 | 0000 | — |

**Change PINs after first login via Manage Team.**
