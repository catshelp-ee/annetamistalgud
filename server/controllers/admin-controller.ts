import { Request, Response } from 'express';
import { prisma } from '../prisma';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
// Default password hash for 'catshelp2024'
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH ||
  '$2b$10$rKZVx4qP4fqJ8yJ9pHJ6YOYZxX6qJ8yJ9pHJ6YOYZxX6qJ8yJ9pH'; // This is just a placeholder

export async function loginHandler(req: Request, res: Response) {
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ error: 'Password required' });
  }

  try {
    console.log('Login attempt - JWT_SECRET:', JWT_SECRET?.substring(0, 10) + '...');
    const isValid = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);

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
      include: {
        donations: {
          where: { paid: true },
          select: { amount: true }
        }
      },
      orderBy: { id: 'asc' }
    });

    // Calculate current amounts
    const goalsWithAmounts = goals.map(goal => ({
      id: goal.id,
      name: goal.name,
      issue: goal.issue || '',
      current: goal.donations.reduce((sum, d) => sum + d.amount, 0),
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
  const { name, issue, goal, color, code } = req.body;

  if (!name || !goal) {
    return res.status(400).json({ error: 'Name and goal are required' });
  }

  try {
    const newGoal = await prisma.goal.create({
      data: {
        name,
        issue: issue || null,
        target: parseFloat(goal),
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
  const { name, issue, goal, color } = req.body;

  try {
    const updated = await prisma.goal.update({
      where: { id: parseInt(id) },
      data: {
        name,
        issue: issue || null,
        target: parseFloat(goal),
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
