import { useState, useEffect } from "react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";

interface VetBill {
  id?: number;
  name: string;
  issue: string;
  current: number;
  goal: number;
}

export default function Admin() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [authToken, setAuthToken] = useState<string | null>(
    () => localStorage.getItem("adminToken")
  );
  const [vetBills, setVetBills] = useState<VetBill[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [newBill, setNewBill] = useState<VetBill>({
    name: "",
    issue: "",
    current: 0,
    goal: 0,
  });
  const [loading, setLoading] = useState(false);

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      if (authToken) {
        try {
          const response = await fetch('/api/admin/verify', {
            headers: {
              'Authorization': `Bearer ${authToken}`
            }
          });

          if (response.ok) {
            setIsAuthenticated(true);
            fetchVetBills();
          } else {
            // Token invalid, clear it
            localStorage.removeItem('adminToken');
            setAuthToken(null);
          }
        } catch (error) {
          console.error('Auth check failed:', error);
          localStorage.removeItem('adminToken');
          setAuthToken(null);
        }
      }
    };

    checkAuth();
  }, [authToken]);

  const apiHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${authToken}`
  });

  const fetchVetBills = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/goals', {
        headers: apiHeaders()
      });

      if (response.ok) {
        const data = await response.json();
        setVetBills(data);
      } else if (response.status === 401) {
        // Unauthorized, logout
        handleLogout();
      }
    } catch (error) {
      console.error('Failed to fetch vet bills:', error);
      alert('Viga andmete laadimisel');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });

      if (!response.ok) {
        throw new Error('Invalid password');
      }

      const { token } = await response.json();
      setAuthToken(token);
      localStorage.setItem('adminToken', token);
      setIsAuthenticated(true);
      fetchVetBills();
    } catch (error) {
      alert('Vale parool!');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setAuthToken(null);
    localStorage.removeItem('adminToken');
    setIsAuthenticated(false);
    setVetBills([]);
  };

  const handleAddBill = async () => {
    if (!newBill.name || newBill.goal <= 0) {
      alert("Palun täida kõik kohustuslikud väljad!");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/admin/goals', {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify(newBill)
      });

      if (response.ok) {
        await fetchVetBills();
        setNewBill({ name: "", issue: "", current: 0, goal: 0 });
      } else if (response.status === 401) {
        handleLogout();
      } else {
        throw new Error('Failed to create goal');
      }
    } catch (error) {
      console.error('Create goal error:', error);
      alert('Viga kliiniku lisamisel');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateBill = async (index: number, bill: VetBill) => {
    if (!bill.id) {
      alert('Kliiniku ID puudub');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/admin/goals/${bill.id}`, {
        method: 'PUT',
        headers: apiHeaders(),
        body: JSON.stringify(bill)
      });

      if (response.ok) {
        await fetchVetBills();
        setEditingIndex(null);
      } else if (response.status === 401) {
        handleLogout();
      } else {
        throw new Error('Failed to update goal');
      }
    } catch (error) {
      console.error('Update goal error:', error);
      alert('Viga kliiniku uuendamisel');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBill = async (bill: VetBill) => {
    if (!bill.id) {
      alert('Kliiniku ID puudub');
      return;
    }

    if (!confirm("Kas oled kindel, et soovid selle kliiniku kustutada?")) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/admin/goals/${bill.id}`, {
        method: 'DELETE',
        headers: apiHeaders()
      });

      if (response.ok) {
        await fetchVetBills();
      } else if (response.status === 401) {
        handleLogout();
      } else {
        throw new Error('Failed to delete goal');
      }
    } catch (error) {
      console.error('Delete goal error:', error);
      alert('Viga kliiniku kustutamisel');
    } finally {
      setLoading(false);
    }
  };

  const exportData = () => {
    const dataStr = JSON.stringify(vetBills, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `vet-bills-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#f9e9f3] flex items-center justify-center p-4">
        <div className="bg-white rounded-[20px] shadow-lg p-8 max-w-xs">
          <h1 className="font-['Schoolbell',sans-serif] text-[#29d4e8] text-[40px] uppercase text-center mb-6">
            Admin Login
          </h1>
          <form onSubmit={handleLogin}>
            <div className="mb-6">
              <label className="font-['Schoolbell',sans-serif] text-[#062d3e] text-[22px] mb-2 block">
                Parool
              </label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-[50px] rounded-[20px] border-2 border-black text-[18px] font-['Schoolbell',sans-serif] px-4"
                placeholder="Sisesta parool"
                disabled={loading}
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-[#29d4e8] hover:bg-[#36d6e9] text-white font-['Schoolbell',sans-serif] text-[24px] h-[50px] rounded-[20px]"
            >
              {loading ? 'Laadin...' : 'Logi sisse'}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  const totalCurrent = vetBills.reduce((sum, bill) => sum + bill.current, 0);
  const totalGoal = vetBills.reduce((sum, bill) => sum + bill.goal, 0);

  return (
    <div className="min-h-screen bg-[#f9e9f3] p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-[20px] shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="font-['Schoolbell',sans-serif] text-[#29d4e8] text-[40px] uppercase">
                Cats Help Annetamistalgute Admin
              </h1>
              <p className="font-['Schoolbell',sans-serif] text-[#062d3e] text-[20px]">
                Kokku: {totalCurrent.toFixed(2)}€ / {totalGoal}€ ({Math.round((totalCurrent / totalGoal) * 100)}%)
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={exportData}
                className="bg-[#ff80ce] hover:bg-[#ff90d6] text-white font-['Schoolbell',sans-serif] text-[18px] h-[45px] px-6 rounded-[20px]"
                disabled={loading}
              >
                Ekspordi JSON
              </Button>
              <Button
                onClick={handleLogout}
                className="bg-gray-500 hover:bg-gray-600 text-white font-['Schoolbell',sans-serif] text-[18px] h-[45px] px-6 rounded-[20px]"
              >
                Logi välja
              </Button>
            </div>
          </div>
        </div>

        {/* Add New Bill Form */}
        <div className="bg-white rounded-[20px] shadow-lg p-6 mb-6">
          <h2 className="font-['Schoolbell',sans-serif] text-[#ff80ce] text-[30px] uppercase mb-4">
            Lisa uus kliinik
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="font-['Schoolbell',sans-serif] text-[#062d3e] text-[18px] mb-1 block">
                Kliiniku nimi *
              </label>
              <Input
                value={newBill.name}
                onChange={(e) => setNewBill({ ...newBill, name: e.target.value })}
                className="h-[45px] rounded-[15px] border-2 border-black text-[16px] font-['Schoolbell',sans-serif] px-3"
                placeholder="nt. Cat Clinicus"
                disabled={loading}
              />
            </div>
            <div>
              <label className="font-['Schoolbell',sans-serif] text-[#062d3e] text-[18px] mb-1 block">
                Probleem (valikuline)
              </label>
              <Input
                value={newBill.issue}
                onChange={(e) => setNewBill({ ...newBill, issue: e.target.value })}
                className="h-[45px] rounded-[15px] border-2 border-black text-[16px] font-['Schoolbell',sans-serif] px-3"
                placeholder="nt. Operatsioon"
                disabled={loading}
              />
            </div>
            <div>
              <label className="font-['Schoolbell',sans-serif] text-[#062d3e] text-[18px] mb-1 block">
                Kogutud (€)
              </label>
              <Input
                type="number"
                value={newBill.current}
                onChange={(e) => setNewBill({ ...newBill, current: parseFloat(e.target.value) || 0 })}
                className="h-[45px] rounded-[15px] border-2 border-black text-[16px] font-['Schoolbell',sans-serif] px-3"
                placeholder="0"
                disabled={loading}
              />
            </div>
            <div>
              <label className="font-['Schoolbell',sans-serif] text-[#062d3e] text-[18px] mb-1 block">
                Eesmärk (€) *
              </label>
              <Input
                type="number"
                value={newBill.goal}
                onChange={(e) => setNewBill({ ...newBill, goal: parseFloat(e.target.value) || 0 })}
                className="h-[45px] rounded-[15px] border-2 border-black text-[16px] font-['Schoolbell',sans-serif] px-3"
                placeholder="0"
                disabled={loading}
              />
            </div>
          </div>
          <Button
            onClick={handleAddBill}
            disabled={loading}
            className="mt-4 bg-[#29d4e8] hover:bg-[#36d6e9] text-white font-['Schoolbell',sans-serif] text-[20px] h-[50px] px-8 rounded-[20px]"
          >
            {loading ? 'Laadin...' : 'Lisa kliinik'}
          </Button>
        </div>

        {/* Bills List */}
        <div className="bg-white rounded-[20px] shadow-lg p-6">
          <h2 className="font-['Schoolbell',sans-serif] text-[#29d4e8] text-[30px] uppercase mb-4">
            Kõik kliinikud ({vetBills.length})
          </h2>
          {loading && vetBills.length === 0 ? (
            <p className="text-center text-gray-500">Laadin andmeid...</p>
          ) : (
            <div className="space-y-4">
              {vetBills.map((bill, index) => (
                <div key={bill.id || index} className="border-2 border-gray-200 rounded-[15px] p-4">
                  {editingIndex === index ? (
                    // Edit Mode
                    <div>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                        <Input
                          value={bill.name}
                          onChange={(e) => {
                            const updated = [...vetBills];
                            updated[index] = { ...updated[index], name: e.target.value };
                            setVetBills(updated);
                          }}
                          className="h-[40px] rounded-[10px] border-2 border-black text-[16px] font-['Schoolbell',sans-serif] px-3"
                          placeholder="Kliiniku nimi"
                          disabled={loading}
                        />
                        <Input
                          value={bill.issue}
                          onChange={(e) => {
                            const updated = [...vetBills];
                            updated[index] = { ...updated[index], issue: e.target.value };
                            setVetBills(updated);
                          }}
                          className="h-[40px] rounded-[10px] border-2 border-black text-[16px] font-['Schoolbell',sans-serif] px-3"
                          placeholder="Probleem"
                          disabled={loading}
                        />
                        <Input
                          type="number"
                          value={bill.current}
                          onChange={(e) => {
                            const updated = [...vetBills];
                            updated[index] = { ...updated[index], current: parseFloat(e.target.value) || 0 };
                            setVetBills(updated);
                          }}
                          className="h-[40px] rounded-[10px] border-2 border-black text-[16px] font-['Schoolbell',sans-serif] px-3"
                          placeholder="Kogutud"
                          disabled={loading}
                        />
                        <Input
                          type="number"
                          value={bill.goal}
                          onChange={(e) => {
                            const updated = [...vetBills];
                            updated[index] = { ...updated[index], goal: parseFloat(e.target.value) || 0 };
                            setVetBills(updated);
                          }}
                          className="h-[40px] rounded-[10px] border-2 border-black text-[16px] font-['Schoolbell',sans-serif] px-3"
                          placeholder="Eesmärk"
                          disabled={loading}
                        />
                      </div>
                      <div className="flex gap-2 items-center">
                        <button
                          onClick={() => handleUpdateBill(index, bill)}
                          disabled={loading}
                          style={{
                            backgroundColor: '#22c55e',
                            color: 'white',
                            fontFamily: 'Schoolbell, sans-serif',
                            fontSize: '16px',
                            height: '35px',
                            minHeight: '35px',
                            padding: '0 16px',
                            borderRadius: '10px',
                            border: 'none',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            opacity: loading ? 0.5 : 1
                          }}
                          onMouseEnter={(e) => !loading && (e.currentTarget.style.backgroundColor = '#16a34a')}
                          onMouseLeave={(e) => !loading && (e.currentTarget.style.backgroundColor = '#22c55e')}
                        >
                          Salvesta
                        </button>
                        <button
                          onClick={() => setEditingIndex(null)}
                          disabled={loading}
                          style={{
                            backgroundColor: '#9ca3af',
                            color: 'white',
                            fontFamily: 'Schoolbell, sans-serif',
                            fontSize: '16px',
                            height: '35px',
                            minHeight: '35px',
                            padding: '0 16px',
                            borderRadius: '10px',
                            border: 'none',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            opacity: loading ? 0.5 : 1
                          }}
                          onMouseEnter={(e) => !loading && (e.currentTarget.style.backgroundColor = '#6b7280')}
                          onMouseLeave={(e) => !loading && (e.currentTarget.style.backgroundColor = '#9ca3af')}
                        >
                          Tühista
                        </button>
                        <button
                          onClick={() => {
                            setEditingIndex(null);
                            handleDeleteBill(bill);
                          }}
                          disabled={loading}
                          style={{
                            backgroundColor: '#ef4444',
                            color: 'white',
                            fontFamily: 'Schoolbell, sans-serif',
                            fontSize: '16px',
                            height: '35px',
                            minHeight: '35px',
                            padding: '0 16px',
                            borderRadius: '10px',
                            border: 'none',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            opacity: loading ? 0.5 : 1
                          }}
                          onMouseEnter={(e) => !loading && (e.currentTarget.style.backgroundColor = '#dc2626')}
                          onMouseLeave={(e) => !loading && (e.currentTarget.style.backgroundColor = '#ef4444')}
                        >
                          Kustuta
                        </button>
                      </div>
                    </div>
                  ) : (
                    // View Mode
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-['Schoolbell',sans-serif] text-[#062d3e] text-[22px]">
                            {bill.name}
                            {bill.issue && <span className="text-gray-500"> - {bill.issue}</span>}
                          </h3>
                          <span className="text-sm bg-gray-100 px-2 py-1 rounded">
                            #{index + 1}
                          </span>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex-1 max-w-md">
                            <div className="bg-gray-200 h-[30px] rounded-full overflow-hidden">
                              <div
                                className="h-full bg-[#ff80ce] transition-all"
                                style={{ width: `${Math.min((bill.current / bill.goal) * 100, 100)}%` }}
                              />
                            </div>
                          </div>
                          <span className="font-['Schoolbell',sans-serif] text-[#062d3e] text-[18px] min-w-[150px]">
                            {bill.current.toFixed(2)}€ / {bill.goal}€
                          </span>
                          <span className="font-['Schoolbell',sans-serif] text-[#062d3e] text-[18px] min-w-[50px]">
                            {Math.round((bill.current / bill.goal) * 100)}%
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2 ml-4">
                        <Button
                          onClick={() => setEditingIndex(index)}
                          disabled={loading}
                          className="bg-[#29d4e8] hover:bg-[#36d6e9] text-white font-['Schoolbell',sans-serif] text-[16px] h-[40px] px-4 min-w-[80px]"
                          style={{ borderRadius: '10px' }}
                        >
                          Muuda
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => handleDeleteBill(bill)}
                          disabled={loading}
                          className="font-['Schoolbell',sans-serif] text-[16px] h-[40px] px-4 min-w-[80px]"
                          style={{ borderRadius: '10px' }}
                        >
                          Kustuta
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="bg-yellow-50 border-2 border-yellow-300 rounded-[15px] p-4 mt-6">
          <p className="font-['Schoolbell',sans-serif] text-[#062d3e] text-[18px]">
            ℹ️ <strong>Juhend:</strong> Andmed salvestatakse andmebaasi.
            Pealeht kasutab samu andmeid. Ekspordi JSON fail varukoopia jaoks.
          </p>
        </div>
      </div>
    </div>
  );
}
