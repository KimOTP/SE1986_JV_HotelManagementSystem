import { Badge } from 'react-bootstrap';
import { getTaskStatus } from '../constants/operationsLabels';

export default function TaskStatusBadge({ status }) {
  const definition = getTaskStatus(status);
  return (
    <Badge bg={definition.color} text={definition.text}>
      {definition.label}
    </Badge>
  );
}
