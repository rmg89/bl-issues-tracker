import { UserLocationRolesTable, formatUserLocationRole } from '../../../lib/airtable'

export default async function handler(req, res) {
  // GET /api/location-roles?userId=xxx  OR  ?locationId=xxx
  if (req.method === 'GET') {
    const { userId, locationId } = req.query
    try {
      let formula = ''
      if (userId && locationId) {
        formula = `AND({UserId} = '${userId}', {LocationId} = '${locationId}')`
      } else if (userId) {
        formula = `{UserId} = '${userId}'`
      } else if (locationId) {
        formula = `{LocationId} = '${locationId}'`
      }

      const records = formula
        ? await UserLocationRolesTable.select({ filterByFormula: formula }).all()
        : await UserLocationRolesTable.select().all()

      return res.status(200).json(records.map(formatUserLocationRole))
    } catch (err) {
      return res.status(500).json({ error: err.message })
    }
  }

  // POST — assign a user to a location with a role
  if (req.method === 'POST') {
    const { userId, locationId, locationName, role } = req.body
    if (!userId || !locationId || !role) {
      return res.status(400).json({ error: 'userId, locationId, and role required' })
    }
    try {
      // Check if role already exists for this user+location and update instead
      const existing = await UserLocationRolesTable.select({
        filterByFormula: `AND({UserId} = '${userId}', {LocationId} = '${locationId}')`
      }).all()

      let record
      if (existing.length > 0) {
        record = await UserLocationRolesTable.update(existing[0].id, { Role: role })
      } else {
        record = await UserLocationRolesTable.create({
          UserId: userId,
          LocationId: locationId,
          LocationName: locationName || '',
          Role: role,
        })
      }
      return res.status(200).json(formatUserLocationRole(record))
    } catch (err) {
      return res.status(500).json({ error: err.message })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}