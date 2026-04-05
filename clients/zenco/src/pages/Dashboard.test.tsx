import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Dashboard from './Dashboard';
import { mockGarments, mockFinances } from '../mocks/data';

describe('Dashboard view', () => {
  it('renders the welcome message', () => {
    render(<Dashboard />);
    expect(screen.getByText('Hola, Ana 👋')).toBeInTheDocument();
  });

  it('calculates the balance correctly based on mock data', () => {
    render(<Dashboard />);
    const totalIncome = mockFinances.filter(f => f.type === 'income').reduce((a, b) => a + b.amount, 0);
    const totalExpenses = mockFinances.filter(f => f.type === 'expense').reduce((a, b) => a + b.amount, 0);
    const expectedBalance = totalIncome - totalExpenses;
    
    // We expect the formatted balance string to be visible
    expect(screen.getByText(`$${expectedBalance.toLocaleString()}`)).toBeInTheDocument();
  });

  it('displays the list of urgent garments', () => {
    render(<Dashboard />);
    const pending = mockGarments.filter(g => g.status !== 'entregado');
    const urgent = pending.filter(g => new Date(g.deliveryDate) <= new Date('2026-04-06'));
    
    // Test if the table has the urgent elements
    if (urgent.length > 0) {
      expect(screen.getByText(urgent[0].garmentName)).toBeInTheDocument();
    }
  });
});
