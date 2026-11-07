import { Badge } from 'react-bootstrap';
import { getIssueStatus } from '../constants/operationsLabels';

export default function IssueStatusBadge({ status }) {
  const definition = getIssueStatus(status);
  return (
    <Badge bg={definition.color} text={definition.text}>
      {definition.label}
    </Badge>
  );
}
