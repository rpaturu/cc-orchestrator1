import {
  BedrockRuntimeClient,
  InvokeModelCommand,
  InvokeModelCommandInput,
} from '@aws-sdk/client-bedrock-runtime';
import { Logger } from '../../core/Logger';
import { 
  BedrockRequest, 
  BedrockResponse, 
  AnalysisConfig,
  MODEL_CONFIGS,
  SupportedModel 
} from '../types/AnalysisTypes';

export class BedrockCore {
  private readonly bedrock: BedrockRuntimeClient;
  private readonly logger: Logger;
  private readonly config: AnalysisConfig;

  constructor(config: AnalysisConfig, logger: Logger, region?: string) {
    this.config = config;
    this.logger = logger;
    this.bedrock = new BedrockRuntimeClient({ region: region || process.env.AWS_REGION });
  }

  /**
   * Invoke AWS Bedrock with the given prompts
   */
  async invokeModel(request: BedrockRequest): Promise<string> {
    const { systemPrompt, userPrompt, model, maxTokens, temperature } = request;
    
    const modelId = model || this.config.model;
    const effectiveMaxTokens = maxTokens || this.config.maxTokens;
    const effectiveTemperature = temperature || this.config.temperature;

    this.logger.debug('Invoking Bedrock model', {
      modelId,
      maxTokens: effectiveMaxTokens,
      temperature: effectiveTemperature,
      systemPromptLength: systemPrompt.length,
      userPromptLength: userPrompt.length,
    });

    try {
      const response = await this.invokeBedrockModel(
        modelId,
        systemPrompt,
        userPrompt,
        effectiveMaxTokens,
        effectiveTemperature
      );

      this.logger.debug('Bedrock invocation successful', {
        modelId,
        responseLength: response.length,
      });

      return response;
    } catch (error) {
      this.logger.error('Bedrock invocation failed', {
        modelId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error(`Bedrock invocation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Internal method to handle model-specific invocation logic
   */
  private async invokeBedrockModel(
    modelId: string,
    systemPrompt: string,
    userPrompt: string,
    maxTokens: number,
    temperature: number
  ): Promise<string> {
    let requestBody: any;

    // Handle different model families
    if (modelId.includes('anthropic.claude')) {
      requestBody = {
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: maxTokens,
        temperature,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userPrompt,
          },
        ],
      };
    } else if (modelId.includes('meta.llama')) {
      requestBody = {
        prompt: `<s>[INST] <<SYS>>\n${systemPrompt}\n<</SYS>>\n\n${userPrompt} [/INST]`,
        max_gen_len: maxTokens,
        temperature,
        top_p: 0.9,
      };
    } else if (modelId.includes('amazon.titan')) {
      requestBody = {
        inputText: `${systemPrompt}\n\nUser: ${userPrompt}\n\nAssistant:`,
        textGenerationConfig: {
          maxTokenCount: maxTokens,
          temperature,
          topP: 0.9,
          stopSequences: ['User:'],
        },
      };
    } else {
      throw new Error(`Unsupported model: ${modelId}`);
    }

    const command = new InvokeModelCommand({
      modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(requestBody),
    } as InvokeModelCommandInput);

    const response = await this.bedrock.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));

    // Parse response based on model type
    if (modelId.includes('anthropic.claude')) {
      return responseBody.content?.[0]?.text || '';
    } else if (modelId.includes('meta.llama')) {
      return responseBody.generation || '';
    } else if (modelId.includes('amazon.titan')) {
      return responseBody.results?.[0]?.outputText || '';
    }

    throw new Error(`Unable to parse response from model: ${modelId}`);
  }

  /**
   * Get model configuration for a specific model
   */
  getModelConfig(model: SupportedModel): typeof MODEL_CONFIGS[SupportedModel] {
    return MODEL_CONFIGS[model];
  }

  /**
   * Validate model availability
   */
  async validateModel(modelId: string): Promise<boolean> {
    try {
      const testCommand = new InvokeModelCommand({
        modelId,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({
          anthropic_version: 'bedrock-2023-05-31',
          max_tokens: 10,
          temperature: 0.1,
          messages: [
            {
              role: 'user',
              content: 'Test',
            },
          ],
        }),
      } as InvokeModelCommandInput);

      await this.bedrock.send(testCommand);
      return true;
    } catch (error) {
      this.logger.warn('Model validation failed', { modelId, error: error instanceof Error ? error.message : String(error) });
      return false;
    }
  }

  /**
   * Health check for Bedrock service
   */
  async healthCheck(): Promise<{ status: string; model: string; region: string }> {
    try {
      const isAvailable = await this.validateModel(this.config.model);
      return {
        status: isAvailable ? 'healthy' : 'degraded',
        model: this.config.model,
        region: this.bedrock.config.region?.toString() || 'unknown',
      };
    } catch (error) {
      this.logger.error('Bedrock health check failed', { error: error instanceof Error ? error.message : String(error) });
      return {
        status: 'unhealthy',
        model: this.config.model,
        region: this.bedrock.config.region?.toString() || 'unknown',
      };
    }
  }

  /**
   * Get the configured max tokens
   */
  get maxTokens(): number {
    return this.config.maxTokens;
  }

  /**
   * Parse user input with AI assistance
   */
  async parseUserInput(prompt: string): Promise<string> {
    const systemPrompt = `You are a helpful assistant that clarifies and structures user input. 
    Provide clear, structured responses based on the user's request.`;

    return this.invokeModel({
      systemPrompt,
      userPrompt: prompt,
      maxTokens: this.config.maxTokens,  // ✅ Use configured maxTokens instead of hardcoded 1000
      temperature: 0.1,
    });
  }
} 