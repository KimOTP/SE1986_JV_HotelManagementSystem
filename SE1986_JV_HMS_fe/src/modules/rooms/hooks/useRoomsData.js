import { useCallback, useEffect, useState } from 'react';
import { roomsApi } from '../api/roomsApi';
export function useRoomsData() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const reload = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setData(await roomsApi.getAll());
    } catch (e) {
      setError(e?.response?.data?.message || e.message || 'Không thể tải dữ liệu.');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const v = await roomsApi.getAll();
        if (active) setData(v);
      } catch (e) {
        if (active) setError(e?.response?.data?.message || e.message);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);
  return { data, loading, error, reload };
}
