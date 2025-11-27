import { Request, Response } from 'express';
import { prisma } from '../prisma';
import jwt from 'jsonwebtoken';

// TEMPORARY: Development defaults - REMOVE when production secrets are configured
const JWT_SECRET = process.env.JWT_SECRET || 'temp-dev-jwt-secret-change-in-production';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'testadmin123';

// Warn if using fallback credentials
if (!process.env.JWT_SECRET || !process.env.ADMIN_PASSWORD) {
  console.warn('⚠️  WARNING: Using temporary development credentials!');
  console.warn('⚠️  Set JWT_SECRET and ADMIN_PASSWORD in production .env');
  if (!process.env.ADMIN_PASSWORD) {
    console.warn('⚠️  Default admin password: testadmin123');
  }
}

export async function loginHandler(req: Request, res: Response) {
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ error: 'Password required' });
  }

  try {
    console.log('Login attempt:');
    console.log('  - Received password length:', password?.length);
    console.log('  - Expected password length:', ADMIN_PASSWORD?.length);
    console.log('  - Received password:', JSON.stringify(password));
    console.log('  - Expected password:', JSON.stringify(ADMIN_PASSWORD));
    console.log('  - Are they equal?:', password === ADMIN_PASSWORD);
    const isValid = password === ADMIN_PASSWORD;

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    const token = jwt.sign({ adminId: 'admin' }, JWT_SECRET, { expiresIn: '24h' });
    console.log('Token generated successfully');
    res.json({ token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
}

export async function verifyHandler(req: Request, res: Response) {
  res.json({ valid: true });
}

export async function listGoalsHandler(req: Request, res: Response) {
  try {
    const goals = await prisma.goal.findMany({
      orderBy: { id: 'asc' }
    });

    const goalsWithAmounts = goals.map(goal => ({
      id: goal.id,
      name: goal.name,
      issue: goal.issue || '',
      current: goal.current,
      goal: goal.target,
      color: goal.color,
      code: goal.code
    }));

    res.json(goalsWithAmounts);
  } catch (error) {
    console.error('listGoalsHandler error:', error);
    res.status(500).json({ error: 'Failed to fetch goals' });
  }
}

export async function createGoalHandler(req: Request, res: Response) {
  const { name, issue, goal, current, color, code } = req.body;

  if (!name || !goal) {
    return res.status(400).json({ error: 'Name and goal are required' });
  }

  try {
    const newGoal = await prisma.goal.create({
      data: {
        name,
        issue: issue || null,
        target: parseFloat(goal),
        current: current ? parseFloat(current) : 0,
        color: color || '#ff80ce',
        code: code || name.toLowerCase().replace(/\s+/g, '-'),
        unit: '€',
        link: '#donation-section',
        message: 'Anneta',
        description: name
      }
    });

    res.json(newGoal);
  } catch (error) {
    console.error('createGoalHandler error:', error);
    res.status(500).json({ error: 'Failed to create goal' });
  }
}

export async function updateGoalHandler(req: Request, res: Response) {
  const { id } = req.params;
  const { name, issue, goal, current, color } = req.body;

  try {
    const updated = await prisma.goal.update({
      where: { id: parseInt(id) },
      data: {
        name,
        issue: issue || null,
        target: parseFloat(goal),
        current: parseFloat(current),
        color: color || '#ff80ce'
      }
    });

    res.json(updated);
  } catch (error) {
    console.error('updateGoalHandler error:', error);
    res.status(500).json({ error: 'Failed to update goal' });
  }
}

export async function deleteGoalHandler(req: Request, res: Response) {
  const { id } = req.params;

  try {
    // First delete associated donations
    await prisma.donation.deleteMany({
      where: { goalID: parseInt(id) }
    });

    // Then delete the goal
    await prisma.goal.delete({
      where: { id: parseInt(id) }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('deleteGoalHandler error:', error);
    res.status(500).json({ error: 'Failed to delete goal' });
  }
}
