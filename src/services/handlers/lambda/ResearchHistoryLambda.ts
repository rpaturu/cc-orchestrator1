import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { ResearchHistoryService } from '../../ResearchHistoryService';
import { withSession, SessionAwareLambdaEvent } from '../../../middleware/SessionMiddleware';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Session-ID',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Credentials': 'true',
};

// Internal handler that can work with session-aware events
const internalResearchHistoryHandler = async (
  event: SessionAwareLambdaEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  // Handle CORS preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: '',
    };
  }

  // Get userId from session context (required)
  const userId = event.userContext.userId;
  
  console.log('Research history request:', {
    sessionId: event.sessionId,
    userId,
    email: event.userContext.email
  });

  // Extract company name from path parameters (if present)
  const companyName = event.pathParameters?.companyName;

  // Initialize research history service
  const researchHistoryService = new ResearchHistoryService();

  // Handle different HTTP methods
  switch (event.httpMethod) {
    case 'GET':
      if (event.pathParameters?.companyName) {
        // GET /research-history/companies/{companyName}
        const companyName = decodeURIComponent(event.pathParameters.companyName);
        const research = await researchHistoryService.getCompanyResearch(userId, companyName);
        
        if (!research) {
          return {
            statusCode: 404,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'Research data not found' })
          };
        }
        
        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify({ research })
        };
      } else {
        // GET /research-history/companies
        const result = await researchHistoryService.getUserCompanies(userId);
        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify(result)
        };
      }
      
    case 'PUT':
      if (event.pathParameters?.companyName) {
        // PUT /research-history/companies/{companyName}
        const companyName = decodeURIComponent(event.pathParameters.companyName);
        const data = JSON.parse(event.body || '{}');
        const research = await researchHistoryService.saveCompanyResearch(userId, companyName, data);
        
        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify({ 
            message: 'Research data saved successfully',
            research 
          })
        };
      }
      break;
      
    case 'DELETE':
      if (event.path.endsWith('/all-data')) {
        // DELETE /research-history/all-data (GDPR Right to Erasure)
        const result = await researchHistoryService.deleteAllUserData(userId);
        
        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify(result)
        };
      } else if (event.pathParameters?.companyName) {
        // DELETE /research-history/companies/{companyName}
        const companyName = decodeURIComponent(event.pathParameters.companyName);
        const result = await researchHistoryService.deleteCompanyResearch(userId, companyName);
        
        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify(result)
        };
      }
      break;
  }

  return {
    statusCode: 405,
    headers: corsHeaders,
    body: JSON.stringify({
      error: 'Method not allowed',
      method: event.httpMethod,
      requestId: context.awsRequestId,
    }),
  };
};

// Export session-only handler (clean implementation)
export const researchHistoryHandler = withSession(
  internalResearchHistoryHandler
);
